using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

public sealed class LianeServiceImpl : MongoCrudEntityService<LianeRequest, LianeDb, Liane.Api.Trip.Liane>, ILianeService
{
  const int MaxDeltaInSeconds = 15 * 60; // 15 min
  const int DefaultRadiusInMeters = 10_000; // 10km
  const int LianeMatchPageDeltaInHours = 24;

  private readonly ICurrentContext currentContext;
  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly IChatService chatService;

  public LianeServiceImpl(IMongoDatabase mongo, IRoutingService routingService, ICurrentContext currentContext, IRallyingPointService rallyingPointService, IChatService chatService) : base(mongo)
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
    var inputTrip = await routingService.GetWayPoints(from, to);
    
    // Select lazily while under limit 
    var lianes = await Filter(filter, inputTrip)
      .SelectAsync(l => MatchLiane(l, filter, inputTrip));

    Cursor? nextCursor = null; //TODO
    return new PaginatedResponse<LianeMatch>(lianes.Count, nextCursor, lianes
      .Where(l => l is not null)
      .Cast<LianeMatch>()
      .OrderBy(l =>
      {
        var exactMatchScore = l.MatchData is MatchType.ExactMatch ? 0 : 1;
        var hourDeltaScore = (filter.TargetTime.DateTime - l.Liane.DepartureTime).Hours;
        return hourDeltaScore * 2 + exactMatchScore;
      })
      .ThenByDescending(l => l.MatchData is MatchType.ExactMatch ? 0 : ((MatchType.CompatibleMatch)l.MatchData).DeltaInSeconds)
      .ToImmutableList());
  }

  public async Task<PaginatedResponse<Liane.Api.Trip.Liane>> ListForCurrentUser(Pagination pagination)
  {
    var currentUser = currentContext.CurrentUser();
    return await ListForMemberUser(currentUser.Id, pagination);
  }

  public async Task<PaginatedResponse<Liane.Api.Trip.Liane>> ListAll(Pagination pagination)
  {
    var paginatedLianes = await Mongo.Paginate(pagination, l => l.DepartureTime, FilterDefinition<LianeDb>.Empty);
    return await paginatedLianes.SelectAsync(MapEntity);
  }

  public async Task<PaginatedResponse<Liane.Api.Trip.Liane>> ListForMemberUser(string userId, Pagination pagination)
  {
    var filter = GetAccessLevelFilter(userId, ResourceAccessLevel.Member);

    var paginatedLianes = await Mongo.Paginate(pagination, l => l.DepartureTime, filter);
    return await paginatedLianes.SelectAsync(MapEntity);
  }

  public async Task<Liane.Api.Trip.Liane> AddMember(Ref<Liane.Api.Trip.Liane> liane, LianeMember newMember)
  {
    var toUpdate = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Id == liane.Id
      ).FirstOrDefaultAsync();
    if (toUpdate is null) throw ResourceNotFoundException.For(liane);
    if (toUpdate.Members.Exists(m => m.User == newMember.User)) throw new ArgumentException();

    // If Liane now has 2 users, create a conversation
    var updateDef =   Builders<LianeDb>.Update.Push(l => l.Members, newMember)
      .Set(l => l.TotalSeatCount, toUpdate.TotalSeatCount + newMember.SeatCount);
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
        new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After });

    return await MapEntity(updated!);
  }

  public async Task<Liane.Api.Trip.Liane?> RemoveMember(Ref<Liane.Api.Trip.Liane> liane, Ref<Liane.Api.User.User> member)
  {
    var updated = await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync<LianeDb>(l => l.Id == liane.Id,
        Builders<LianeDb>.Update.Pull("Members.User", member)
      ,new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After });
    if (updated is null) throw ResourceNotFoundException.For(liane);
    if (updated.Members.IsEmpty)
    {
      await Delete(liane);
      return null;
    }
    else
    {
      return await MapEntity(updated);
    }
  }


  private (RouteSegment, ImmutableList<RouteSegment>) ExtractRouteSegments(Ref<Liane.Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
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

  private async Task<ImmutableSortedSet<WayPoint>> GetWayPoints(Ref<Liane.Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
  {
    var (driverSegment, segments) = ExtractRouteSegments(driver, lianeMembers);
    var result = await routingService.GetTrip(driverSegment, segments);
    if (result == null) throw new NullReferenceException();
    return result;
  }

  protected override async Task<Liane.Api.Trip.Liane> MapEntity(LianeDb liane)
  {
    var driver = liane.DriverData.CanDrive ? liane.DriverData.User : null;
    var wayPoints = await GetWayPoints(liane.DriverData.User, liane.Members);
    return new Liane.Api.Trip.Liane(liane.Id, liane.CreatedBy!, liane.CreatedAt, liane.DepartureTime, liane.ReturnTime, wayPoints, liane.Members, driver, liane.Conversation);
  }

  protected override LianeDb ToDb(LianeRequest lianeRequest, string originalId, DateTime createdAt, string createdBy)
  {
    var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To, lianeRequest.ReturnTime is not null, lianeRequest.AvailableSeats) };
    var driverData = new DriverData(createdBy, lianeRequest.AvailableSeats > 0);
    return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime,
      lianeRequest.ReturnTime, members.ToImmutableList(), driverData);
  }

  public new async Task<Liane.Api.Trip.Liane> Create(LianeRequest obj, string ownerId)
  {
    var created = await base.Create(obj, ownerId);
    await UpdateGeometry(created); //TODO index async ?
    return created;
  }

  private async Task UpdateGeometry(Liane.Api.Trip.Liane liane)
  {
    var route = await routingService.GetRoute(liane.WayPoints.Select(w => w.RallyingPoint.Location).ToImmutableList());
    var boundingBox = Geometry.GetOrientedBoundingBox(route.Coordinates);
    await Mongo.GetCollection<LianeDb>().UpdateOneAsync(l => l.Id == liane.Id, Builders<LianeDb>.Update.Set(l => l.Geometry, boundingBox));
  }

  public async Task<(ImmutableSortedSet<WayPoint> wayPoints, MatchType matchType)?> GetNewTrip(Ref<Api.Trip.Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment)
  {
    MatchType matchType;
    ImmutableSortedSet<WayPoint> newWayPoints;
    var lianeDb = await ResolveRef<LianeDb>(liane);
    var (driverSegment, segments) = ExtractRouteSegments(lianeDb.DriverData.User, lianeDb.Members);
    var wayPoints = (await routingService.GetTrip(driverSegment, segments))!;
    var initialTripDuration = wayPoints.TotalDuration();
    if (wayPoints.IncludesSegment((from, to)))
    {
      newWayPoints = wayPoints;
      matchType = new MatchType.ExactMatch();
    }
    else
    {
      // If match for a driver, use the candidate segment as driverSegment
      var matchDriverSegment = isDriverSegment ? (from, to) : driverSegment;
      var matchSegments = isDriverSegment ? segments : segments.Append((from, to));
      var tripIntent = await routingService.GetTrip(matchDriverSegment, matchSegments);
      if (tripIntent is null)
      {
        return null;
      }

      newWayPoints = tripIntent;
      var delta = newWayPoints.TotalDuration() - initialTripDuration;
      if (delta > MaxDeltaInSeconds)
      {
        return null;
      }

      matchType = new MatchType.CompatibleMatch(delta);
    }

    return (newWayPoints, matchType);
  }

  private async Task<LianeMatch?> MatchLiane(LianeDb lianeDb, Filter filter, ImmutableSortedSet<WayPoint> trip)
  {
    var from = trip.First();
    var to = trip.Last();
    
    var matchForDriver = filter.AvailableSeats > 0;
    var defaultDriver = lianeDb.DriverData.User;
    var (driverSegment, segments) = ExtractRouteSegments(defaultDriver, lianeDb.Members);
    var wayPoints = (await routingService.GetTrip(driverSegment, segments))!;
    var initialTripDuration = wayPoints.TotalDuration();

    if (filter.TargetTime.Direction == Direction.Arrival && lianeDb.DepartureTime.AddSeconds(initialTripDuration) > filter.TargetTime.DateTime)
    {
      // For filters on arrival types, filter here using trip duration
      return null;
    }

    ImmutableSortedSet<WayPoint> newWayPoints;
    MatchType matchType;
    if (wayPoints.IncludesSegment((from.RallyingPoint, to.RallyingPoint)))
    {
      newWayPoints = wayPoints;
      matchType = new MatchType.ExactMatch();
    }
    else
    {
      // If match for a driver, use the candidate segment as driverSegment
      var matchDriverSegment = matchForDriver ? (from.RallyingPoint, to.RallyingPoint) : driverSegment;
      var matchSegments = matchForDriver ? segments : segments.Concat(trip.ToRouteSegments());
      var tripIntent = await routingService.GetTrip(matchDriverSegment, matchSegments);
      if (tripIntent is null)
      {
        return null;
      }

      newWayPoints = tripIntent;
      var delta = newWayPoints.TotalDuration() - initialTripDuration;
      if (delta > MaxDeltaInSeconds)
      {
        return null;
      }

      matchType = new MatchType.CompatibleMatch(delta);
    }

    var driver = lianeDb.DriverData.CanDrive ? lianeDb.DriverData.User : null;
    var originalLiane = new Liane.Api.Trip.Liane(lianeDb.Id, lianeDb.CreatedBy!, lianeDb.CreatedAt, lianeDb.DepartureTime, lianeDb.ReturnTime, wayPoints, lianeDb.Members, driver);
    return new LianeMatch(originalLiane, newWayPoints, lianeDb.TotalSeatCount, matchType);
  }

  private IFindFluent<LianeDb, LianeDb> Filter(Filter filter, ImmutableSortedSet<WayPoint> trip)
  {
    // Use geoIntersect as Mongo only supports one $near filter per query
    var nearTo = Builders<LianeDb>.Filter.GeoIntersects(
      l => l.Geometry,
      Geometry.GetOrientedBoundingBox(trip.Select(t => t.RallyingPoint.Location).ToImmutableList())
    );

    // Filter departureTime +/- 24h
    var lowerBound = filter.TargetTime.DateTime.AddHours(-LianeMatchPageDeltaInHours);
    var upperBound = filter.TargetTime.DateTime.AddHours(LianeMatchPageDeltaInHours);
    var timeFilter = Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, lowerBound)
                     & Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, upperBound);

    // If search is passenger search, fetch Liane with driver only
    var isDriverSearch = Builders<LianeDb>.Filter.Eq(l => l.DriverData.CanDrive, filter.AvailableSeats <= 0);

    // l => l.TotalSeatCount + filter.AvailableSeats > 0
    var hasAvailableSeats = Builders<LianeDb>.Filter.Gte(l => l.TotalSeatCount, -filter.AvailableSeats);

    var f = timeFilter & isDriverSearch & hasAvailableSeats & nearTo;
    return Mongo.GetCollection<LianeDb>()
      .Find(f);
  }
}