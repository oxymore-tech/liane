using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Util;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed class LianeServiceImpl : MongoCrudEntityService<LianeRequest, LianeDb, Api.Trip.Liane>, ILianeService
{
  private const int MaxDeltaInSeconds = 15 * 60; // 15 min
  private const int LianeMatchPageDeltaInHours = 24;

  private readonly ICurrentContext currentContext;
  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly IChatService chatService;

  public LianeServiceImpl(
    IMongoDatabase mongo,
    IRoutingService routingService,
    ICurrentContext currentContext,
    IRallyingPointService rallyingPointService,
    IChatService chatService) : base(mongo)
  {
    this.routingService = routingService;
    this.currentContext = currentContext;
    this.rallyingPointService = rallyingPointService;
    this.chatService = chatService;
  }

  public async Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination)
  {
    var from = await filter.From.Resolve(rallyingPointService.Get);
    var to = await filter.To.Resolve(rallyingPointService.Get);

    var targetRoute = Simplifier.Simplify(await routingService.GetRoute(ImmutableList.Create(from.Location, to.Location)));

    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(BuilderLianeFilter(targetRoute, filter.TargetTime, filter.AvailableSeats))
      .SelectAsync(l => MatchLiane(l, from, to, filter, targetRoute));

    Cursor? nextCursor = null; //TODO
    return new PaginatedResponse<LianeMatch>(lianes.Count, nextCursor, lianes
      .Where(l => l is not null)
      .Cast<LianeMatch>()
      .OrderBy(l =>
      {
        var exactMatchScore = l.Match is Match.Exact ? 0 : 1;
        var hourDeltaScore = (filter.TargetTime.DateTime - l.Liane.DepartureTime).Hours;
        return hourDeltaScore * 2 + exactMatchScore;
      })
      .ThenByDescending(l => l.Match is Match.Exact ? 0 : ((Match.Compatible)l.Match).PickupPoints[0].DeltaInSeconds)
      .ToImmutableList());
  }

  public async Task<PaginatedResponse<Api.Trip.Liane>> ListForCurrentUser(Pagination pagination)
  {
    var currentUser = currentContext.CurrentUser();
    return await ListForMemberUser(currentUser.Id, pagination);
  }

  public async Task<PaginatedResponse<Api.Trip.Liane>> ListAll(Pagination pagination)
  {
    var paginatedLianes = await Mongo.Paginate(pagination, l => l.DepartureTime, FilterDefinition<LianeDb>.Empty);
    return await paginatedLianes.SelectAsync(MapEntity);
  }

  public async Task<PaginatedResponse<Api.Trip.Liane>> ListForMemberUser(string userId, Pagination pagination)
  {
    var filter = GetAccessLevelFilter(userId, ResourceAccessLevel.Member);

    var paginatedLianes = await Mongo.Paginate(pagination, l => l.DepartureTime, filter);
    return await paginatedLianes.SelectAsync(MapEntity);
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

    var updateDef = (await UpdateGeometry(toUpdate.Driver.User, toUpdate.Members.Add(newMember)))
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

    var updated = await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync<LianeDb>(l => l.Id == liane.Id,
        updateDef,
        new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After }
      );

    return await MapEntity(updated);
  }

  public async Task<Api.Trip.Liane?> RemoveMember(Ref<Api.Trip.Liane> liane, Ref<Api.User.User> member)
  {
    var updated = await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync<LianeDb>(l => l.Id == liane.Id,
        Builders<LianeDb>.Update.Pull("members.user", member)
        , new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After });
    if (updated is null)
    {
      throw ResourceNotFoundException.For(liane);
    }

    if (!updated.Members.IsEmpty)
    {
      return await MapEntity(updated);
    }

    await Delete(liane);
    return null;
  }

  private static (RouteSegment, ImmutableList<RouteSegment>) ExtractRouteSegments(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
  {
    Ref<RallyingPoint>? from = null;
    Ref<RallyingPoint>? to = null;
    var segments = new HashSet<RouteSegment>();

    foreach (var member in lianeMembers)
    {
      if (member.User.Id == driver.Id)
      {
        from = member.From;
        to = member.To;
      }
      else
      {
        segments.Add((member.From, member.To));
      }
    }

    if (from == null || to == null)
    {
      throw new ArgumentException();
    }

    return ((from, to), segments.ToImmutableList());
  }

  private async Task<ImmutableSortedSet<WayPoint>> GetWayPoints(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
  {
    var (driverSegment, segments) = ExtractRouteSegments(driver, lianeMembers);
    var result = await routingService.GetTrip(driverSegment, segments);
    if (result == null)
    {
      throw new NullReferenceException();
    }

    return result;
  }

  protected override async Task<Api.Trip.Liane> MapEntity(LianeDb liane)
  {
    var wayPoints = await GetWayPoints(liane.Driver.User, liane.Members);
    return new Api.Trip.Liane(liane.Id, liane.CreatedBy!, liane.CreatedAt, liane.DepartureTime, liane.ReturnTime, wayPoints, liane.Members, liane.Driver, liane.Conversation);
  }

  protected override LianeDb ToDb(LianeRequest lianeRequest, string originalId, DateTime createdAt, string createdBy)
  {
    var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To, lianeRequest.ReturnTime is not null, lianeRequest.AvailableSeats) };
    var driverData = new Driver(createdBy, lianeRequest.AvailableSeats > 0);
    return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime,
      lianeRequest.ReturnTime, members.ToImmutableList(), driverData);
  }

  public new async Task<Api.Trip.Liane> Create(LianeRequest obj, string ownerId)
  {
    var created = await base.Create(obj, ownerId);
    var updateDefinition = await UpdateGeometry(created.WayPoints);
    await Mongo.GetCollection<LianeDb>()
      .UpdateOneAsync(l => l.Id == created.Id, updateDefinition);
    return created;
  }
  
  public async Task UpdateAllGeometries()
  {
    await Mongo.GetCollection<LianeDb>().Find(FilterDefinition<LianeDb>.Empty).SelectAsync(async l => UpdateGeometry((await MapEntity(l)).WayPoints));
  }

  public async Task<Match?> GetNewTrip(Ref<Api.Trip.Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment)
  {
    var resolved = await liane.Resolve(Get);
    var (driverSegment, segments) = ExtractRouteSegments(resolved.Driver.User, resolved.Members);
    var wayPoints = (await routingService.GetTrip(driverSegment, segments))!;
    var initialTripDuration = wayPoints.TotalDuration();
    if (wayPoints.IncludesSegment((from, to)))
    {
      return new Match.Exact();
    }

    // If match for a driver, use the candidate segment as driverSegment
    var matchDriverSegment = isDriverSegment ? (from, to) : driverSegment;
    var matchSegments = isDriverSegment ? segments : segments.Append((from, to));
    var tripIntent = await routingService.GetTrip(matchDriverSegment, matchSegments);
    if (tripIntent is null)
    {
      return null;
    }

    var delta = tripIntent.TotalDuration() - initialTripDuration;
    return delta > MaxDeltaInSeconds
      ? null
      : new Match.Compatible(ImmutableList.Create(new PickupPoint(delta, from, tripIntent)));
  }

  public async Task<LianeDisplay> Display(LatLng pos, LatLng pos2)
  {
    var now = DateTime.UtcNow;
    var filter = Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, now)
                 & Builders<LianeDb>.Filter.Lte(l => l.DepartureTime, now.AddHours(24))
                 & Builders<LianeDb>.Filter.GeoIntersects(
                   l => l.Geometry,
                   Geometry.GetBoundingBox(pos, pos2)
                 );

    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(filter)
      .SortBy(l => l.DepartureTime)
      .SelectAsync(MapEntity);

    var rawLianeSegments = await lianes.GroupBy(l => l.WayPoints)
      .SelectAsync(async g =>
      {
        var route = await routingService.GetRoute(g.Key.Select(w => w.RallyingPoint.Location).ToImmutableList());
        return new LianeSegment(route.Coordinates, g.Select(l => (Ref<Api.Trip.Liane>)l.Id).ToImmutableList());
      });

    var lianeSegments = RouteOptimizer.TruncateOverlappingSegments(rawLianeSegments);

    return new LianeDisplay(lianeSegments, lianes);
  }

  private async Task<UpdateDefinition<LianeDb>> UpdateGeometry(Ref<Api.User.User> driver, IEnumerable<LianeMember> members)
  {
    var wayPoints = await GetWayPoints(driver, members);
    return await UpdateGeometry(wayPoints);
  }

  private async Task<UpdateDefinition<LianeDb>> UpdateGeometry(ImmutableSortedSet<WayPoint> wayPoints)
  {
    var simplifiedRoute = await routingService.GetSimplifiedRoute(wayPoints.Select(w => w.RallyingPoint.Location).ToImmutableList());
    return Builders<LianeDb>.Update.Set(l => l.Geometry, simplifiedRoute.ToGeoJson());
  }

  private async Task<LianeMatch?> MatchLiane(LianeDb lianeDb, RallyingPoint from, RallyingPoint to, Filter filter, ImmutableList<LatLng> targetRoute)
  {
    var matchForDriver = filter.AvailableSeats > 0;
    var defaultDriver = lianeDb.Driver.User;
    var (driverSegment, segments) = ExtractRouteSegments(defaultDriver, lianeDb.Members);
    var wayPoints = await routingService.GetTrip(driverSegment, segments);
    var initialTripDuration = wayPoints.TotalDuration();

    if (filter.TargetTime.Direction == Direction.Arrival && lianeDb.DepartureTime.AddSeconds(initialTripDuration) > filter.TargetTime.DateTime)
    {
      // For filters on arrival types, filter here using trip duration
      return null;
    }

    Match match;
    if (wayPoints.IncludesSegment((from, to)))
    {
      match = new Match.Exact();
    }
    else
    {
      var route = lianeDb.Geometry!.ToLatLng();

      var intersection = targetRoute.GetFirstIntersection(route);

      if (intersection is null)
      {
        return null;
      }

      var pickupPoints = await rallyingPointService.List(intersection, null, 1000);

      if (pickupPoints.IsEmpty)
      {
        // Proposer un parking proche comme point de ralliement
        return null;
      }

      var matchingPickupPoints = new List<PickupPoint>();
      foreach (var pickupPoint in pickupPoints)
      {
        // If match for a driver, use the candidate segment as driverSegment
        var matchDriverSegment = matchForDriver ? (pickupPoint, to) : driverSegment;
        var matchSegments = matchForDriver ? segments.Append(driverSegment) : segments.Append((pickupPoint, to));
        var newWayPoints = await routingService.GetTrip(matchDriverSegment, matchSegments);
        if (newWayPoints is null)
        {
          return null;
        }

        var delta = newWayPoints.TotalDuration() - initialTripDuration;
        if (delta > MaxDeltaInSeconds)
        {
          continue;
        }

        matchingPickupPoints.Add(new PickupPoint(delta, pickupPoint, newWayPoints));
      }

      if (matchingPickupPoints.IsNullOrEmpty())
      {
        return null;
      }

      match = new Match.Compatible(matchingPickupPoints.ToImmutableList());
    }

    var originalLiane = new Api.Trip.Liane(lianeDb.Id, lianeDb.CreatedBy!, lianeDb.CreatedAt, lianeDb.DepartureTime, lianeDb.ReturnTime, wayPoints, lianeDb.Members, lianeDb.Driver);
    return new LianeMatch(originalLiane, lianeDb.TotalSeatCount, match);
  }

  private static FilterDefinition<LianeDb> BuilderLianeFilter(ImmutableList<LatLng> route, DepartureOrArrivalTime time, int availableSeats)
  {
    var intersects = Builders<LianeDb>.Filter.GeoIntersects(l => l.Geometry, route.ToGeoJson());

    DateTime lowerBound, upperBound;
    if (time.Direction == Direction.Departure)
    {
      lowerBound = time.DateTime;
      upperBound = time.DateTime.AddHours(LianeMatchPageDeltaInHours);
    }
    else
    {
      lowerBound = time.DateTime.AddHours(-LianeMatchPageDeltaInHours);
      upperBound = time.DateTime;
    }

    var timeFilter = Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, lowerBound)
                     & Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, upperBound);

    // If search is passenger search, fetch Liane with driver only
    var isDriverSearch = Builders<LianeDb>.Filter.Eq(l => l.Driver.CanDrive, availableSeats <= 0);

    // l => l.TotalSeatCount + availableSeats > 0
    var hasAvailableSeats = Builders<LianeDb>.Filter.Gte(l => l.TotalSeatCount, -availableSeats);

    return timeFilter & isDriverSearch & hasAvailableSeats & intersects;
  }
}