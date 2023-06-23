using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed class LianeServiceImpl : MongoCrudEntityService<LianeRequest, LianeDb, Api.Trip.Liane>, ILianeService
{
  private const int MaxDeltaInSeconds = 15 * 60; // 15 min
  private const int LianeMatchPageDeltaInHours = 24;
  private const int SnapDistanceInMeters = 10000;

  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly IUserService userService;
  private readonly IChatService chatService;
  private readonly ICurrentContext currentContext;
  private readonly IPostgisService postgisService;
  private readonly ILogger<LianeServiceImpl> logger;

  public LianeServiceImpl(
    IMongoDatabase mongo,
    IRoutingService routingService,
    ICurrentContext currentContext,
    IRallyingPointService rallyingPointService,
    IChatService chatService,
    ILogger<LianeServiceImpl> logger, IUserService userService, IPostgisService postgisService) : base(mongo, currentContext)
  {
    this.routingService = routingService;
    this.currentContext = currentContext;
    this.rallyingPointService = rallyingPointService;
    this.chatService = chatService;
    this.logger = logger;
    this.userService = userService;
    this.postgisService = postgisService;
  }

  public new async Task<Api.Trip.Liane> Create(LianeRequest entity, Ref<Api.User.User>? owner = null)
  {
    var liane = await base.Create(entity, owner);
    await postgisService.UpdateGeometry(liane);
    return liane;
  }

  public async Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination, CancellationToken cancellationToken = default)
  {
    var from = await rallyingPointService.Get(filter.From);
    var to = await rallyingPointService.Get(filter.To);

    var targetRoute = Simplifier.Simplify(await routingService.GetRoute(ImmutableList.Create(from.Location, to.Location), cancellationToken));

    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(BuilderLianeFilter(targetRoute, filter.TargetTime, filter.AvailableSeats))
      .SelectAsync(l => MatchLiane(l, filter, targetRoute), cancellationToken: cancellationToken);

    Cursor? nextCursor = null; //TODO
    return new PaginatedResponse<LianeMatch>(lianes.Count, nextCursor, lianes
      .Where(l => l is not null)
      .Cast<LianeMatch>()
      .Order(new BestMatchComparer(from, to, filter.TargetTime))
      .ToImmutableList());
  }

  public async Task<LianeMatchDisplay> MatchWithDisplay(Filter filter, Pagination pagination, CancellationToken cancellationToken = default)
  {
    var matches = await Match(filter, pagination, cancellationToken);
    // Only display the matching part of the liane
    var segments = await GetLianeSegments(matches.Data.Select(m => m.Liane with { WayPoints = m.GetMatchingTrip() }));
    return new LianeMatchDisplay(new FeatureCollection(segments.ToFeatures().ToList()), matches.Data);
  }

  public async Task<PaginatedResponse<Api.Trip.Liane>> List(LianeFilter lianeFilter, Pagination pagination, CancellationToken cancellationToken = default)
  {
    var filter = BuildFilter(lianeFilter);
    var paginatedLianes = await Mongo.Paginate(pagination, l => l.DepartureTime, filter, cancellationToken: cancellationToken);
    if (lianeFilter is { ForCurrentUser: true, States.Length: > 0 })
    {
      // Return with user's version of liane state 
      var result = paginatedLianes.Select(l => l with { State = GetUserState(l, currentContext.CurrentUser().Id) });
      paginatedLianes = result.Where(l => lianeFilter.States.Contains(l.State));
    }

    return await paginatedLianes.SelectAsync(MapEntity);
  }

  private FilterDefinition<LianeDb> BuildFilter(LianeFilter lianeFilter)
  {
    FilterDefinition<LianeDb> filter;
    if (lianeFilter.ForCurrentUser)
    {
      var currentUser = CurrentContext.CurrentUser();
      filter = GetAccessLevelFilter(currentUser.Id, ResourceAccessLevel.Member);
    }

    else filter = FilterDefinition<LianeDb>.Empty;

    if (lianeFilter.States?.Length > 0)
    {
      filter &= (Builders<LianeDb>.Filter.In(l => l.State, lianeFilter.States)
                 // These will be filtered after fetching in db
                 | Builders<LianeDb>.Filter.Eq(l => l.State, LianeState.Started)
                 | Builders<LianeDb>.Filter.Eq(l => l.State, LianeState.Finished));
    }

    return filter;
  }

  public async Task<ImmutableDictionary<Appointment, ImmutableList<Ref<Api.User.User>>>> GetNextAppointments(DateTime fromNow, TimeSpan window)
  {
    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(l =>
        l.State == LianeState.NotStarted && l.DepartureTime > fromNow && l.DepartureTime <= fromNow.Add(window)
        || l.State == LianeState.Started
      )
      .SelectAsync(MapEntity);
    return lianes.Where(l => l.State == LianeState.NotStarted).Select(l =>
      {
        var rallyingPoint = l.WayPoints.First().RallyingPoint;
        return (new Appointment(l, rallyingPoint, l.DepartureTime), l.Members.Where(m => m.From == rallyingPoint).Select(m => m.User).ToImmutableList());
      })
      .ToImmutableDictionary(e => e.Item1, e => e.Item2);
  }

  public async Task<Api.Trip.Liane> AddMember(Ref<Api.Trip.Liane> liane, LianeMember newMember)
  {
    var toUpdate = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Id == liane.Id)
      .FirstOrDefaultAsync();

    if (toUpdate is null)
    {
      throw ResourceNotFoundException.For(liane);
    }

    if (toUpdate.Members.Exists(m => m.User == newMember.User))
    {
      throw new ArgumentException(newMember.User.Id + " already is a member of liane " + liane.Id);
    }

    var updateDef = (await GetTripUpdate(toUpdate.DepartureTime, toUpdate.Driver.User, toUpdate.Members.Add(newMember)))
      .Push(l => l.Members, newMember)
      .Set(l => l.TotalSeatCount, toUpdate.TotalSeatCount + newMember.SeatCount);

    // If Liane now has 2 users, create a conversation
    if (toUpdate.Conversation is null)
    {
      var conv = await chatService.Create(ConversationGroup.CreateWithMembers(new[]
      {
        toUpdate.Members[0].User,
        newMember.User
      }, DateTime.Now), toUpdate.CreatedBy!);
      updateDef = updateDef.Set<LianeDb, Ref<ConversationGroup>?>(l => l.Conversation, conv.Id!);
    }
    else
    {
      await chatService.AddMember(toUpdate.Conversation, newMember.User);
    }

    var updated = await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync<LianeDb>(l => l.Id == liane.Id,
        updateDef,
        new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After }
      );

    var updatedLiane = await MapEntity(updated);
    await postgisService.UpdateGeometry(updatedLiane);
    return updatedLiane;
  }

  public async Task<Api.Trip.Liane?> RemoveMember(Ref<Api.Trip.Liane> liane, Ref<Api.User.User> member)
  {
    var toUpdate = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Id == liane.Id)
      .FirstOrDefaultAsync();

    if (toUpdate is null)
    {
      throw ResourceNotFoundException.For(liane);
    }

    var foundMember = toUpdate.Members.Find(m => m.User == member.Id);

    if (foundMember is null)
    {
      return null;
    }

    if (toUpdate.Driver.User == foundMember.User)
    {
      return null;
    }

    var newMembers = toUpdate.Members.Remove(foundMember);

    var groupDeleted = await chatService.RemoveMember(toUpdate.Conversation!, member);

    if (newMembers.IsEmpty)
    {
      await Delete(liane);
      return null;
    }

    var update = (await GetTripUpdate(toUpdate.DepartureTime, toUpdate.Driver.User, newMembers))
      .Pull(l => l.Members, foundMember)
      .Set(l => l.TotalSeatCount, toUpdate.TotalSeatCount - foundMember.SeatCount);
    if (groupDeleted)
    {
      update = update.Set(l => l.Conversation, null);
    }

    await Mongo.GetCollection<LianeDb>()
      .UpdateOneAsync(l => l.Id == liane.Id, update);

    var updatedLiane = await MapEntity(toUpdate with { Members = newMembers });
    await postgisService.UpdateGeometry(updatedLiane);
    return updatedLiane;
  }

  private async Task<ImmutableList<WayPoint>> GetWayPoints(DateTime departureTime, Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
  {
    var (driverSegment, segments) = await ExtractRouteSegments(driver, lianeMembers);
    var result = await routingService.GetTrip(departureTime, driverSegment, segments);
    if (result == null)
    {
      throw new ValidationException("members", ValidationMessage.MalFormed);
    }

    return result;
  }

  private async Task<(RouteSegment, ImmutableList<RouteSegment>)> ExtractRouteSegments(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
  {
    RallyingPoint? from = null;
    RallyingPoint? to = null;
    var segments = new HashSet<RouteSegment>();

    foreach (var member in lianeMembers)
    {
      if (member.User.Id == driver.Id)
      {
        from = await member.From.Resolve(rallyingPointService.Get);
        to = await member.To.Resolve(rallyingPointService.Get);
      }
      else
      {
        var memberFrom = await member.From.Resolve(rallyingPointService.Get);
        var memberTo = await member.To.Resolve(rallyingPointService.Get);
        segments.Add((memberFrom, memberTo));
      }
    }

    if (from == null || to == null)
    {
      throw new ArgumentException();
    }

    return ((from, to), segments.ToImmutableList());
  }

  protected override async Task<Api.Trip.Liane> MapEntity(LianeDb liane)
  {
    var wayPoints = await liane.WayPoints.SelectAsync(async w =>
    {
      var rallyingPoint = await rallyingPointService.Get(w.RallyingPoint);
      return new WayPoint(rallyingPoint, w.Duration, w.Distance, w.Eta);
    });
    var users = await liane.Members.SelectAsync(async m => m with { User = await userService.Get(m.User) });
    return new Api.Trip.Liane(liane.Id, liane.CreatedBy!, liane.CreatedAt, liane.DepartureTime, liane.ReturnTime, wayPoints, users, liane.Driver, liane.State, liane.Conversation);
  }

  protected override async Task<LianeDb> ToDb(LianeRequest lianeRequest, string originalId, DateTime createdAt, string createdBy)
  {
    if (lianeRequest.From == lianeRequest.To)
    {
      throw new ValidationException("To", ValidationMessage.MalFormed);
    }

    var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To, lianeRequest.ReturnTime is not null, lianeRequest.AvailableSeats) };
    var driverData = new Driver(createdBy, lianeRequest.AvailableSeats > 0);
    var wayPoints = await GetWayPoints(lianeRequest.DepartureTime, driverData.User, members);
    var geometry = await GetGeometry(wayPoints);
    var wayPointDbs = wayPoints.Select(w => new WayPointDb(w.RallyingPoint, w.Duration, w.Distance, w.Eta)).ToImmutableList();
    return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime, lianeRequest.ReturnTime, members.ToImmutableList(), driverData,
      LianeState.NotStarted, wayPointDbs, ImmutableList<UserPing>.Empty, geometry, null);
  }

  public async Task UpdateMissingWaypoints()
  {
    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.WayPoints == null!)
      .ToListAsync();

    if (lianes.Count == 0)
    {
      return;
    }

    var bulks = await lianes.SelectAsync(async db =>
    {
      var wayPoints = await GetWayPoints(db.DepartureTime, db.Driver.User, db.Members);
      var update = Builders<LianeDb>.Update
        .Set(l => l.WayPoints, wayPoints.ToDb());
      return new UpdateOneModel<LianeDb>(Builders<LianeDb>.Filter.Eq(l => l.Id, db.Id), update);
    });
    await Mongo.GetCollection<LianeDb>()
      .BulkWriteAsync(bulks);
  }

  public async Task<Match?> GetNewTrip(Ref<Api.Trip.Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment)
  {
    var resolved = await Get(liane);
    var (driverSegment, segments) = await ExtractRouteSegments(resolved.Driver.User, resolved.Members);
    var wayPoints = (await routingService.GetTrip(resolved.DepartureTime, driverSegment, segments))!;
    var initialTripDuration = wayPoints.TotalDuration();
    if (wayPoints.IncludesSegment((from, to)))
    {
      return new Match.Exact(from.Id!, to.Id!);
    }

    // If match for a driver, use the candidate segment as driverSegment
    var matchDriverSegment = isDriverSegment ? (from, to) : driverSegment;
    var matchSegments = isDriverSegment ? segments : segments.Append((from, to));
    var tripIntent = await routingService.GetTrip(resolved.DepartureTime, matchDriverSegment, matchSegments);
    if (tripIntent is null)
    {
      return null;
    }

    var delta = tripIntent.TotalDuration() - initialTripDuration;
    return delta > initialTripDuration * 0.25 || delta > MaxDeltaInSeconds
      ? null
      : new Match.Compatible(new Delta(delta, tripIntent.TotalDistance() - wayPoints.TotalDistance()), from.Id!, to.Id!, tripIntent);
  }

  public async Task<ImmutableList<ClosestPickups>> GetDestinations(Ref<RallyingPoint> pickup, DateTime dateTime, int availableSeats = -1)
  {
    var from = await rallyingPointService.Get(pickup);
    return await GetNearestLinks(from.Location, dateTime, availableSeats);
  }

  public async Task UpdateFeedback(Ref<Api.Trip.Liane> liane, Feedback feedback)
  {
    var resolved = await Get(liane);
    var sender =
      currentContext.CurrentUser().Id;
    var updated = await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync<LianeDb>(
        l => l.Id == liane,
        Builders<LianeDb>.Update.Set(l => l.Members, resolved.Members.Select(m => m.User.Id == sender ? m with { Feedback = feedback } : m)),
        new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After }
      );
    if (updated.Members.All(m => m.Feedback is not null))
    {
      await Mongo.GetCollection<LianeDb>()
        .UpdateOneAsync(
          l => l.Id == liane,
          Builders<LianeDb>.Update.Set(l => l.State, updated.Members.All(m => m.Feedback!.Canceled) ? LianeState.Canceled : LianeState.Archived)
        );
    }
  }

  public async Task<ImmutableList<ClosestPickups>> GetNearestLinks(LatLng pos, DateTime dateTime, int radius = 30, int availableSeats = -1)
  {
    var filter = Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, dateTime)
                 & Builders<LianeDb>.Filter.Lte(l => l.DepartureTime, dateTime.AddHours(24))
                 & Builders<LianeDb>.Filter.Eq(l => l.Driver.CanDrive, availableSeats <= 0)
                 & Builders<LianeDb>.Filter.Gte(l => l.TotalSeatCount, -availableSeats)
                 & Builders<LianeDb>.Filter.Near(l => l.Geometry, GeoJson.Point(new GeoJson2DGeographicCoordinates(pos.Lng, pos.Lat)), radius);

    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(filter)
      .SelectAsync(MapEntity, parallel: true);

    var points = lianes
      .SelectMany(l => l.WayPoints.Select(w => new { WayPoint = w, Liane = l }))
      .GroupBy(e => e.WayPoint.RallyingPoint)
      .OrderBy(e => e.Key.Location.Distance(pos))
      .TakeWhile(e => e.Key.Location.Distance(pos) < radius);

    return points
      .Select(g => new ClosestPickups(g.Key, GetDestinations(g.Key, lianes)))
      .Where(p => p.Destinations.Count > 0)
      .ToImmutableList();
  }

  public async Task<string> GetContact(Ref<Api.Trip.Liane> id, Ref<Api.User.User> requester, Ref<Api.User.User> member)
  {
    var liane = await Get(id);
    if ((requester.Id == liane.Driver.User.Id && liane.Members.Any(m => m.User.Id == member))
        || (member.Id == liane.Driver.User.Id && liane.Members.Any(m => m.User.Id == requester)))
    {
      var m = await userService.GetFullUser(member);
      return m.Phone;
    }

    throw new ForbiddenException();
  }

  public async Task<FeatureCollection> DisplayGeoJson(LatLng pos, LatLng pos2, DateTime dateTime, CancellationToken cancellationToken = default)
  {
    var displayed = await Display(pos, pos2, dateTime, true, cancellationToken);

    var lianeFeatures = displayed.Segments.ToFeatures();

    // Select all rallying points that can be a pickup 
    var displayedPoints = displayed.Lianes
      .Select(l => l.WayPoints.Take(l.WayPoints.Count - 1))
      .SelectMany(w => w)
      .DistinctBy(w => w.RallyingPoint.Id).Select(w => w.RallyingPoint);

    var rallyingPointsFeatures = displayedPoints.Select(rp => new Feature(new Point(new Position(rp.Location.Lat, rp.Location.Lng)),
      rp.GetType().GetProperties().ToDictionary(prop => prop.Name.NormalizeToCamelCase(), prop => prop.GetValue(rp, null))
    ));

    return new FeatureCollection(lianeFeatures.Concat(rallyingPointsFeatures).ToList());
  }

  public async Task<LianeDisplay> Display(LatLng pos, LatLng pos2, DateTime dateTime, bool includeLianes = false, CancellationToken cancellationToken = default)
  {
    var filter = Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, dateTime)
                 & Builders<LianeDb>.Filter.Lte(l => l.DepartureTime, dateTime.AddHours(24))
                 & Builders<LianeDb>.Filter.Eq(l => l.Driver.CanDrive, true)
                 & Builders<LianeDb>.Filter.Eq(l => l.State, LianeState.NotStarted)
                 & Builders<LianeDb>.Filter.GeoIntersects(l => l.Geometry, GeometryExtensions.GetBoundingBox(pos, pos2));

    var timer = new Stopwatch();
    timer.Start();

    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(filter)
      .SelectAsync(MapEntity, parallel: true, cancellationToken: cancellationToken);
    timer.Stop();
    logger.LogDebug("Fetching {Count} Liane objects : {Elapsed}", lianes.Count, timer.Elapsed);
    var lianeSegments = await GetLianeSegments(lianes);

    return new LianeDisplay(
      lianeSegments,
      includeLianes || CurrentContext.CurrentUser().IsAdmin
        ? lianes.OrderBy(l => l.DepartureTime).ToImmutableList()
        : ImmutableList<Api.Trip.Liane>.Empty
    );
  }

  private static LianeState GetUserState(LianeDb liane, Ref<Api.User.User> forUser)
  {
    var member = liane.Members.Find(m => m.User.Id == forUser.Id)!;
    switch (liane.State)
    {
      case LianeState.Started:
        // TODO adjust time delta
        var pickupPoint = liane.WayPoints.Find(w => w.RallyingPoint.Id == member.From);
        if (pickupPoint!.Eta > DateTime.Now.AddSeconds(30)) return LianeState.NotStarted;
        var depositPoint = liane.WayPoints.Find(w => w.RallyingPoint.Id == member.From);
        if (depositPoint!.Eta < DateTime.Now) return LianeState.Finished;
        break;
      case LianeState.Finished:
        if (member.Feedback is not null) return member.Feedback.Canceled ? LianeState.Canceled : LianeState.Archived;
        break;
    }

    return liane.State;
  }

  private static ImmutableList<RallyingPointLink> GetDestinations(Ref<RallyingPoint> pickup, ImmutableList<Api.Trip.Liane> lianes)
  {
    return lianes
      .SelectMany(l => l.WayPoints.SkipWhile(w => w.RallyingPoint.Id != pickup.Id).Skip(1).Select(w => new { WayPoint = w, Liane = l })
      )
      .GroupBy(p => p.WayPoint.RallyingPoint)
      .Select(gr => new RallyingPointLink(
        gr.Key,
        gr.Select(p => p.Liane.DepartureTime.AddSeconds(p.Liane.WayPoints.TakeUntil(p.WayPoint).TotalDuration())).Order().ToImmutableList()
      ))
      .ToImmutableList();
  }

  private async Task<ImmutableList<LianeSegment>> GetLianeSegments(IEnumerable<Api.Trip.Liane> lianes)
  {
    var segments = lianes.SelectMany(l => l.WayPoints.Skip(1).Select((w, i) => new
      {
        from = l.WayPoints[i].RallyingPoint,
        to = w.RallyingPoint,
        liane = l
      }))
      .GroupBy(s => new
      {
        s.from,
        s.to
      });

    var timer = new Stopwatch();
    timer.Start();
    var rawWayPointsSegments = await segments.SelectAsync(async g =>
    {
      // Fetch route's individual segments for better caching
      var route = await routingService.GetRoute(ImmutableList.Create(g.Key.from.Location, g.Key.to.Location));
      return new LianeSegment(route.Coordinates, g.Select(s => (Ref<Api.Trip.Liane>)s.liane.Id).ToImmutableList());
    }, parallel: true);

    timer.Stop();
    logger.LogDebug("Fetching waypoints segments : {Elapsed}", timer.Elapsed);
    timer.Restart();
    var lianeSegments = RouteOptimizer.TruncateOverlappingSegments(rawWayPointsSegments);
    timer.Stop();
    logger.LogDebug("Computing overlap : {Elapsed}", timer.Elapsed);
    return lianeSegments;
  }

  private async Task<UpdateDefinition<LianeDb>> GetTripUpdate(DateTime departureTime, Ref<Api.User.User> driver, IEnumerable<LianeMember> members)
  {
    var wayPoints = await GetWayPoints(departureTime, driver, members);
    var geometry = await GetGeometry(wayPoints);
    return Builders<LianeDb>.Update
      .Set(l => l.WayPoints, wayPoints.ToDb())
      .Set(l => l.Geometry, geometry);
  }

  private async Task<GeoJsonLineString<GeoJson2DGeographicCoordinates>> GetGeometry(IEnumerable<WayPoint> wayPoints)
  {
    var coordinates = wayPoints.Select(w => w.RallyingPoint.Location);
    var route = await routingService.GetRoute(coordinates);
    var simplifiedRoute = Simplifier.Simplify(route);
    return simplifiedRoute.ToGeoJson();
  }

  private async Task<LianeMatch?> MatchLiane(LianeDb lianeDb, Filter filter, ImmutableList<LatLng> targetRoute)
  {
    var matchForDriver = filter.AvailableSeats > 0;
    var defaultDriver = lianeDb.Driver.User;
    var (driverSegment, segments) = await ExtractRouteSegments(defaultDriver, lianeDb.Members);
    var wayPoints = await routingService.GetTrip(lianeDb.DepartureTime, driverSegment, segments);

    if (wayPoints is null)
    {
      return null;
    }

    var initialTripDuration = wayPoints.TotalDuration();

    if (filter.TargetTime.Direction == Direction.Arrival && lianeDb.DepartureTime.AddSeconds(initialTripDuration) > filter.TargetTime.DateTime)
    {
      // For filters on arrival types, filter here using trip duration
      return null;
    }

    var route = lianeDb.Geometry!.ToLatLng();

    var bestMatch = MatchBestIntersectionPoints(targetRoute, route);

    if (bestMatch is null)
    {
      return null;
    }

    var (pickupLocation, depositLocation) = bestMatch.Value;

    // Try to find a close RallyingPoint
    var pickupPoint = await SnapOrDefault(pickupLocation);
    var depositPoint = await SnapOrDefault(depositLocation);

    if (pickupPoint is not null && pickupPoint == depositPoint)
    {
      // Trip is too short
      return null;
    }

    // Else reverse to request
    pickupPoint ??= await rallyingPointService.Get(filter.From);
    depositPoint ??= await rallyingPointService.Get(filter.To);

    Match match;
    if (wayPoints.IncludesSegment((pickupPoint, depositPoint)))
    {
      match = new Match.Exact(pickupPoint.Id!, depositPoint.Id!);
    }
    else
    {
      // If match for a driver, use the candidate segment as driverSegment
      var matchDriverSegment = matchForDriver ? (pickupPoint, depositPoint) : driverSegment;
      var matchSegments = matchForDriver ? segments.Append(driverSegment) : segments.Append((pickupPoint, depositPoint));
      var newWayPoints = await routingService.GetTrip(lianeDb.DepartureTime, matchDriverSegment, matchSegments);
      if (newWayPoints is null)
      {
        return null;
      }

      var delta = newWayPoints.TotalDuration() - initialTripDuration;
      var maxBound = filter.MaxDeltaInSeconds ?? Math.Min(initialTripDuration * 0.25 + 60, MaxDeltaInSeconds);
      if (delta > maxBound)
      {
        // Too far for driver
        return null;
      }

      var dPickup = await routingService.GetRoute(ImmutableList.Create(targetRoute.First(), pickupPoint.Location));
      var dDeposit = await routingService.GetRoute(ImmutableList.Create(targetRoute.Last(), depositPoint.Location));


      var trip = newWayPoints.SkipWhile(w => w.RallyingPoint.Id != pickupPoint.Id)
        .Skip(1).ToList();
      trip.RemoveRange(0, trip.FindIndex(w => w.RallyingPoint.Id == depositPoint.Id));

      var t = trip.TotalDistance();
      var maxBoundPickup = filter.MaxDeltaInMeters ?? t * 0.65;
      if (dPickup.Distance > maxBoundPickup
          || dDeposit.Distance > SnapDistanceInMeters)
      {
        // Too far for current user
        return null;
      }

      match = new Match.Compatible(new Delta(
        delta,
        newWayPoints.TotalDistance() - wayPoints.TotalDistance(),
        (int)dPickup.Duration,
        (int)dPickup.Distance,
        (int)dDeposit.Duration,
        (int)dDeposit.Distance
      ), pickupPoint.Id!, depositPoint.Id!, newWayPoints);
    }


    return new LianeMatch(await MapEntity(lianeDb), lianeDb.TotalSeatCount, match);
  }

  private (LatLng PickupPoint, LatLng DepositPoint)? MatchBestIntersectionPoints(ImmutableList<LatLng> targetRoute, ImmutableList<LatLng> route)
  {
    var firstIntersection = targetRoute.GetFirstIntersection(route);
    var lastIntersection = targetRoute.GetLastIntersection(route);

    if (firstIntersection is null || lastIntersection is null)
    {
      return null;
    }

    var (firstCoordinate, firstIndex) = firstIntersection.Value;
    var (lastCoordinate, lastIndex) = lastIntersection.Value;

    if (lastIndex - firstIndex < targetRoute.Count / 2)
    {
      return null;
    }

    return (firstCoordinate, lastCoordinate);
  }

  private async Task<RallyingPoint?> SnapOrDefault(LatLng intersection)
  {
    return await rallyingPointService.SnapViaRoute(intersection, SnapDistanceInMeters);
  }

  private FilterDefinition<LianeDb> BuilderLianeFilter(ImmutableList<LatLng> route, DepartureOrArrivalTime time, int availableSeats)
  {
    var intersects = Builders<LianeDb>.Filter.GeoIntersects(l => l.Geometry, route.ToGeoJson());

    DateTime lowerBound, upperBound;
    FilterDefinition<LianeDb> timeFilter;
    if (time.Direction == Direction.Departure)
    {
      lowerBound = time.DateTime;
      upperBound = time.DateTime.AddHours(LianeMatchPageDeltaInHours);
      timeFilter = Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, lowerBound)
                   & Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, upperBound);
    }
    else
    {
      lowerBound = time.DateTime.AddHours(-LianeMatchPageDeltaInHours);
      upperBound = time.DateTime;
      timeFilter = Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta >= lowerBound && w.Eta <= upperBound);
    }


    // If search is passenger search, fetch Liane with driver only
    var isDriverSearch = Builders<LianeDb>.Filter.Eq(l => l.Driver.CanDrive, availableSeats <= 0);

    // l => l.TotalSeatCount + availableSeats > 0
    var hasAvailableSeats = Builders<LianeDb>.Filter.Gte(l => l.TotalSeatCount, -availableSeats);

    var userIsMember = Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == currentContext.CurrentUser().Id);

    return timeFilter & isDriverSearch & hasAvailableSeats & intersects & !userIsMember;
  }

  public async Task UpdateDepartureTime(Ref<Api.Trip.Liane> liane, DateTime departureTime)
  {
    await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync(l => l.Id == liane.Id, Builders<LianeDb>.Update.Set(l => l.DepartureTime, departureTime));
    // TODO notify members ?
  }
}