using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
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
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed class LianeServiceImpl : MongoCrudEntityService<LianeRequest, LianeDb, Api.Trip.Liane>, ILianeService
{
  private const int MaxDeltaInSeconds = 15 * 60; // 15 min
  private const int MaxDepositDeltaInMeters = 1000;
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

    logger.LogDebug("Match lianes from '{From}' to '{To}' - '{TargetTime}'", from.Label, to.Label, filter.TargetTime);
    var targetRoute = await routingService.GetRoute(ImmutableList.Create(from.Location, to.Location), cancellationToken);
    DateTime lowerBound, upperBound;
    if (filter.TargetTime.Direction == Direction.Departure)
    {
      lowerBound = filter.TargetTime.DateTime;
      upperBound = filter.TargetTime.DateTime.AddHours(LianeMatchPageDeltaInHours);
    }
    else
    {
      lowerBound = filter.TargetTime.DateTime.AddHours(-LianeMatchPageDeltaInHours);
      upperBound = filter.TargetTime.DateTime;
    }

    var timer = new Stopwatch();
    timer.Start();
    var results = await postgisService.GetMatchingLianes(targetRoute, lowerBound, upperBound);
    timer.Stop();
    logger.LogDebug("Posgis match {count} lianes in {Elapsed} ms", results.Count, timer.ElapsedMilliseconds);

    var resultDict = results.GroupBy(r => r.Liane).ToDictionary(g => g.Key, g => g.ToImmutableList());

    var isDriverSearch = Builders<LianeDb>.Filter.Eq(l => l.Driver.CanDrive, filter.AvailableSeats <= 0);

    var hasAvailableSeats = Builders<LianeDb>.Filter.Gte(l => l.TotalSeatCount, -filter.AvailableSeats);

    var userIsMember = Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == currentContext.CurrentUser().Id);

    timer.Restart();
    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(isDriverSearch & hasAvailableSeats & !userIsMember & Builders<LianeDb>.Filter.In(l => l.Id, resultDict.Keys.Select(k => (string)k)))
      .ToListAsync(cancellationToken);
    timer.Stop();
    logger.LogDebug("Find {count} compatible liane by filter in {Elapsed} ms", lianes.Count, timer.ElapsedMilliseconds);

    timer.Restart();
    var matches = await lianes.SelectAsync(l => MatchLiane(l, filter, resultDict[l.Id], targetRoute.Coordinates.ToLatLng()), parallel: true);
    timer.Stop();
    logger.LogDebug("Computed {Count} compatible matches in {Elapsed} ms", matches.Count, timer.ElapsedMilliseconds);

    var paginated = matches
      .Where(l => l is not null)
      .Cast<LianeMatch>()
      .Order(new DistanceFromComparer())
      .Take(20)
      .OrderBy(l => l.DepartureTime)
      .ToImmutableList();
    Cursor? nextCursor = null; //TODO
    return new PaginatedResponse<LianeMatch>(matches.Count, nextCursor, paginated, paginated.Count);
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

  public async Task<ImmutableList<ClosestPickups>> GetPickupLinks(LinkFilterPayload payload)
  {
    var from = await rallyingPointService.Get(payload.Pickup);
    var links = await Mongo.GetCollection<LianeDb>()
      .Find(Builders<LianeDb>.Filter.In(l => l.Id, payload.Lianes.Select(l => l.Id)))
      .SelectAsync(async lianeDb =>
      {
        var (driverSegment, segments) = await ExtractRouteSegments(lianeDb.Driver.User, lianeDb.Members);
        var destination = await rallyingPointService.Get(lianeDb.WayPoints.Last().RallyingPoint);
        var newWayPoints = await routingService.GetTrip(lianeDb.DepartureTime, driverSegment, segments.Append((from, destination)));
        return (lianeDb, newWayPoints);
      }, parallel: true);
    var destinations = links
      .Where(l => l.newWayPoints is not null)
      .Select(l => (l.newWayPoints!.Last().RallyingPoint,
        pickupTime: l.lianeDb.DepartureTime + TimeSpan.FromSeconds(l.newWayPoints!.TakeUntilInclusive(w => w.RallyingPoint.Id == from.Id).TotalDuration())))
      .GroupBy(l => l.RallyingPoint);

    return new List<ClosestPickups>
    {
      new(from, destinations.Select(g => new RallyingPointLink(
        g.Key,
        g.Select(item => item.pickupTime).Order().ToImmutableList())
      ).ToImmutableList())
    }.ToImmutableList();
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
    var wayPointDbs = wayPoints.Select(w => new WayPointDb(w.RallyingPoint, w.Duration, w.Distance, w.Eta)).ToImmutableList();
    return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime, lianeRequest.ReturnTime, members.ToImmutableList(), driverData,
      LianeState.NotStarted, wayPointDbs, ImmutableList<UserPing>.Empty, null);
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
    return Builders<LianeDb>.Update
      .Set(l => l.WayPoints, wayPoints.ToDb());
  }

  private async Task<LianeMatch?> MatchLiane(LianeDb lianeDb, Filter filter, ImmutableList<LianeMatchCandidate> candidates, ImmutableList<LatLng> targetRoute)
  {
    var matchForDriver = filter.AvailableSeats > 0;
    var defaultDriver = lianeDb.Driver.User;

    var liane = await MapEntity(lianeDb);
    var initialTripDuration = liane.WayPoints.TotalDuration();
    if (filter.TargetTime.Direction == Direction.Arrival && lianeDb.DepartureTime.AddSeconds(initialTripDuration) > filter.TargetTime.DateTime)
    {
      // For filters on arrival types, filter here using trip duration
      return null;
    }

    RallyingPoint? pickupPoint, depositPoint;

    if (candidates.Find(c => c.Mode == MatchResultMode.Exact) is not null)
    {
      pickupPoint = await rallyingPointService.Get(filter.From);
      depositPoint = await rallyingPointService.Get(filter.To);
      var match = new Match.Exact(pickupPoint.Id!, depositPoint.Id!);
      return new LianeMatch(await MapEntity(lianeDb), lianeDb.TotalSeatCount, match);
    }

    // Try detour first, otherwise fallback to partial match
    var detourCandidate = candidates.Find(c => c.Mode == MatchResultMode.Detour);
    var partialCandidate = candidates.Find(c => c.Mode == MatchResultMode.Partial);

    foreach (var candidate in new List<LianeMatchCandidate?> { detourCandidate, partialCandidate }.Where(c => c is not null))
    {
      pickupPoint = await SnapOrDefault(candidate!.Pickup);
      depositPoint = await SnapOrDefault(candidate.Deposit);

      if (pickupPoint is null || depositPoint is null || pickupPoint == depositPoint)
      {
        continue;
      }

      var (driverSegment, segments) = await ExtractRouteSegments(defaultDriver, lianeDb.Members);
      var matchDriverSegment = matchForDriver ? (pickupPoint, depositPoint) : driverSegment;
      var matchSegments = matchForDriver ? segments.Append(driverSegment) : segments.Append((pickupPoint, depositPoint));

      var newWayPoints = await routingService.GetTrip(lianeDb.DepartureTime, matchDriverSegment, matchSegments);
      if (newWayPoints is null)
      {
        continue;
      }

      var delta = newWayPoints.TotalDuration() - initialTripDuration;
      var maxBound = filter.MaxDeltaInSeconds ?? Math.Min(initialTripDuration * 0.25 + 60, MaxDeltaInSeconds);
      if (delta > maxBound)
      {
        // Too far for driver
        continue;
      }

      var dPickup = await routingService.GetRoute(ImmutableList.Create(targetRoute.First(), pickupPoint.Location));
      var dDeposit = await routingService.GetRoute(ImmutableList.Create(targetRoute.Last(), depositPoint.Location));

      var trip = newWayPoints.SkipWhile(w => w.RallyingPoint.Id != pickupPoint.Id)
        .Skip(1).ToList();
      trip.RemoveRange(0, trip.FindIndex(w => w.RallyingPoint.Id == depositPoint.Id));

      var t = trip.TotalDistance();
      var maxBoundPickup = filter.MaxDeltaInMeters ?? t * 0.50;
      if (dPickup.Distance > maxBoundPickup || dDeposit.Distance > MaxDepositDeltaInMeters)
      {
        // Too far for current user
        continue;
      }

      var compatibleMatch = new Match.Compatible(new Delta(
        delta,
        newWayPoints.TotalDistance() - liane.WayPoints.TotalDistance(),
        (int)dPickup.Duration,
        (int)dPickup.Distance,
        (int)dDeposit.Duration,
        (int)dDeposit.Distance
      ), pickupPoint.Id!, depositPoint.Id!, newWayPoints);

      return new LianeMatch(liane, lianeDb.TotalSeatCount, compatibleMatch);
    }

    return null;
  }

  private async Task<RallyingPoint?> SnapOrDefault(LatLng intersection)
  {
    return await rallyingPointService.SnapViaRoute(intersection, SnapDistanceInMeters);
  }

  public async Task UpdateDepartureTime(Ref<Api.Trip.Liane> liane, DateTime departureTime)
  {
    await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync(l => l.Id == liane.Id, Builders<LianeDb>.Update.Set(l => l.DepartureTime, departureTime));
    // TODO notify members ?
  }
}