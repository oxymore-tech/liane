using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

public sealed class LianeServiceImpl : MongoCrudEntityService<LianeRequest, LianeDb, Api.Trip.Liane>, ILianeService
{
  const int MaxDeltaInSeconds = 15 * 60; // 15 min
  const int DefaultRadiusInMeters = 10_000; // 10km
  const int LianeMatchPageDeltaInHours = 24; 

  private readonly ICurrentContext currentContext;
  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;

  public LianeServiceImpl(IMongoDatabase mongo, IRoutingService routingService, ICurrentContext currentContext, IRallyingPointService rallyingPointService) : base(mongo)
  {
    this.routingService = routingService;
    this.currentContext = currentContext;
    this.rallyingPointService = rallyingPointService;
  }

  public async Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination)
  {
    var from = (await filter.From.Resolve(rallyingPointService.Get));
    var to = (await filter.To.Resolve(rallyingPointService.Get));
    var resolvedFilter = filter with { From = from, To = to };
    var isDriverMatch = filter.AvailableSeats > 0;
    // Filter Lianes in database 
    var lianesCursor = await Filter(resolvedFilter);
    
    // Select lazily while under limit 
    var lianes = await lianesCursor.SelectAsync(l => MatchLiane(l, from, to, isDriverMatch));

    Cursor? nextCursor = null; //TODO
    return new PaginatedResponse<LianeMatch>(lianes.Count, nextCursor,lianes
      .Where(l => l is not null)
      .Cast<LianeMatch>()
      .OrderBy(l =>
      {
        var exactMatchScore = l.MatchData is ExactMatch ? 0 : 1;
        var hourDeltaScore = (filter.TargetTime.DateTime - l.DepartureTime).Hours;
        return hourDeltaScore*2 + exactMatchScore;
      })
      .ThenByDescending(l => l.MatchData is ExactMatch ? 0 : ((CompatibleMatch)l.MatchData).DeltaInSeconds)
      .ToImmutableList());
  }

  
  public async Task<IFindFluent<LianeDb, LianeDb>> Filter(Filter filter, int geographicalRadius = DefaultRadiusInMeters)
  {
    // Get Liane near both From and To 
    var from = await filter.From.Resolve(rallyingPointService.Get);
    var to = await filter.To.Resolve(rallyingPointService.Get);
    var nearFrom = Builders<LianeDb>.Filter.Near(
      l => l.Geometry,
      GeoJson.Point(GeoJson.Geographic(from.Location.Lng, from.Location.Lat)), maxDistance: geographicalRadius);

    // Use geoIntersect as Mongo only supports one $near filter per query
    var nearTo = Builders<LianeDb>.Filter.GeoIntersects(
      l => l.Geometry,
      Geometry.GetApproxCircle(to.Location, geographicalRadius)
    );
    
    // Filter departureTime
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
    var timeFilter = Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, lowerBound)
                     & Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, upperBound);

    // If search is passenger search, fetch Liane with driver only
    var isDriverSearch = Builders<LianeDb>.Filter.Eq(l => l.DriverData.CanDrive , filter.AvailableSeats <= 0);
    
   // TODO var hasAvailableSeats = Builders<LianeDb>.Filter.Where(l => l.Members.Select(m => m.SeatCount).Sum() + filter.AvailableSeats > 0);

    var f = nearFrom & timeFilter & nearTo &  isDriverSearch;

    return Mongo.GetCollection<LianeDb>()
      .Find(f);
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

  private (RouteSegment, ImmutableList<RouteSegment>) ExtractRouteSegments(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
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
    if (result == null) throw new NullReferenceException();
    return result;
  }

  protected override async Task<Api.Trip.Liane> MapEntity(LianeDb liane)
  {
    var driver =  liane.DriverData.CanDrive ? liane.DriverData.User : null;
    var wayPoints = await GetWayPoints(liane.DriverData.User, liane.Members);
    return new Api.Trip.Liane(liane.Id, liane.CreatedBy!, liane.CreatedAt, liane.DepartureTime, liane.ReturnTime, wayPoints, liane.Members, driver);
  }

  protected override LianeDb ToDb(LianeRequest lianeRequest, string originalId, DateTime createdAt, string createdBy)
  {
    var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To, lianeRequest.AvailableSeats) };
    var driverData = new DriverData(createdBy, lianeRequest.AvailableSeats > 0);
    return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime,
      lianeRequest.ReturnTime, members.ToImmutableList(), driverData);
  }

  public new async Task<Api.Trip.Liane> Create(LianeRequest obj, string ownerId)
  {
    var created = await base.Create(obj, ownerId);
    await UpdateGeographyAsync(created); //TODO index async ?
    return created;
  }

  private async Task UpdateGeographyAsync(Api.Trip.Liane liane)
  {
    var route = await routingService.GetRoute(liane.WayPoints.Select(w => w.RallyingPoint.Location).ToImmutableList());
    var boundingBox = Geometry.GetOrientedBoundingBox(route.Coordinates);
    await Mongo.GetCollection<LianeDb>().UpdateOneAsync(l => l.Id == liane.Id, Builders<LianeDb>.Update.Set(l => l.Geometry, boundingBox));
  }

  private async Task<LianeMatch?> MatchLiane(LianeDb lianeDb, RallyingPoint from, RallyingPoint to, bool matchForDriver)
  {
    var defaultDriver = lianeDb.DriverData.User;
    var (driverSegment, segments) = ExtractRouteSegments(defaultDriver, lianeDb.Members);
    var wayPoints = (await routingService.GetTrip(driverSegment, segments))!;
    ImmutableSortedSet<WayPoint> newWayPoints;
    MatchType matchType;
    if (wayPoints.IncludesSegment((from, to)))
    {
      newWayPoints = wayPoints;
      matchType = new ExactMatch();
    }
    else
    {
      // If match for a driver, use the candidate segment as driverSegment
      var matchDriverSegment = matchForDriver ? (from, to) : driverSegment;
      var matchSegments = matchForDriver ? segments : segments.Append((from, to));
      var tripIntent = await routingService.GetTrip(matchDriverSegment, matchSegments);
      if (tripIntent is null)
      {
        return null;
      }

      newWayPoints = tripIntent;
      var delta = newWayPoints.TotalDuration() - wayPoints.TotalDuration();
      if (delta > MaxDeltaInSeconds)
      {
        return null;
      }

      matchType = new CompatibleMatch(delta);
    }

    var driver =  lianeDb.DriverData.CanDrive ? lianeDb.DriverData.User : null;
    return new LianeMatch(lianeDb.Id, lianeDb.DepartureTime, lianeDb.ReturnTime, newWayPoints, wayPoints, 1, driver, matchType);
  }
}