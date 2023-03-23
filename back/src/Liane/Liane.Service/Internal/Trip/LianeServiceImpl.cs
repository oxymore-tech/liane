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
using Liane.Service.Internal.Util;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed class LianeServiceImpl : MongoCrudEntityService<LianeRequest, LianeDb, Api.Trip.Liane>, ILianeService
{
  private const int MaxDeltaInSeconds = 15 * 60; // 15 min
  private const int DefaultRadiusInMeters = 10_000; // 10km
  private const int LianeMatchPageDeltaInHours = 24;

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
    var from = (await filter.From.Resolve(rallyingPointService.Get));
    var to = (await filter.To.Resolve(rallyingPointService.Get));
    var resolvedFilter = filter with { From = from, To = to };
    // Filter Lianes in database 
    var lianesCursor = await Filter(resolvedFilter);

    // Select lazily while under limit 
    var lianes = await lianesCursor.SelectAsync(l => MatchLiane(l, from, to, filter));

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
      .ThenByDescending(l => l.Match is Match.Exact ? 0 : ((Match.Compatible)l.Match).DeltaInSeconds)
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
    var isDriverSearch = Builders<LianeDb>.Filter.Eq(l => l.Driver.CanDrive, filter.AvailableSeats <= 0);

    // l => l.TotalSeatCount + filter.AvailableSeats > 0
    var hasAvailableSeats = Builders<LianeDb>.Filter.Gte(l => l.TotalSeatCount, -filter.AvailableSeats);

    var f = nearFrom & timeFilter & isDriverSearch & hasAvailableSeats & nearTo;
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

  public async Task<Api.Trip.Liane> AddMember(Ref<Api.Trip.Liane> liane, LianeMember newMember)
  {
    var toUpdate = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Id == liane.Id
      ).FirstOrDefaultAsync();
    if (toUpdate is null) throw ResourceNotFoundException.For(liane);
    if (toUpdate.Members.Exists(m => m.User == newMember.User)) throw new ArgumentException(newMember.User.Id + " already is a member of liane " + liane.Id);

    // If Liane now has 2 users, create a conversation
    var updateDef = Builders<LianeDb>.Update.Push(l => l.Members, newMember)
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
    if (result == null) throw new NullReferenceException();
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
    await UpdateGeographyAsync(created); //TODO index async ?
    return created;
  }

  private async Task UpdateGeographyAsync(Api.Trip.Liane liane)
  {
    var route = await routingService.GetRoute(liane.WayPoints.Select(w => w.RallyingPoint.Location).ToImmutableList());
    var boundingBox = Geometry.GetOrientedBoundingBox(route.Coordinates.ToLatLng());
    await Mongo.GetCollection<LianeDb>()
      .UpdateOneAsync(l => l.Id == liane.Id, Builders<LianeDb>.Update.Set(l => l.Geometry, boundingBox));
  }

  public async Task<(ImmutableSortedSet<WayPoint> wayPoints, Match matchType)?> GetNewTrip(Ref<Api.Trip.Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment)
  {
    Match match;
    ImmutableSortedSet<WayPoint> newWayPoints;
    var resolved = await liane.Resolve(Get);
    var (driverSegment, segments) = ExtractRouteSegments(resolved.Driver.User, resolved.Members);
    var wayPoints = (await routingService.GetTrip(driverSegment, segments))!;
    var initialTripDuration = wayPoints.TotalDuration();
    if (wayPoints.IncludesSegment((from, to)))
    {
      newWayPoints = wayPoints;
      match = new Match.Exact();
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

      match = new Match.Compatible(delta);
    }

    return (newWayPoints, match);
  }

  public async Task<LianeDisplay> Display(LatLng pos, LatLng pos2)
  {
    var rallyingPoints = await rallyingPointService.List(pos, pos2);

    var rallyingPointRefs = rallyingPoints.Select(r => r.Id!)
      .ToImmutableList();
    var filter = Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, DateTime.UtcNow)
                 & (Builders<LianeDb>.Filter.In("Members.From", rallyingPointRefs) | Builders<LianeDb>.Filter.In("Members.To", rallyingPointRefs));
    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(filter)
      .SelectAsync(MapEntity);

    var pointsWithLianes = lianes.SelectMany(l => l.Members.SelectMany(m => ImmutableList.Create((m.From, l), (m.To, l))))
      .GroupBy(t => t.Item1)
      .ToImmutableDictionary(g => g.Key.Id, g => g.Select(e => e.Item2).ToImmutableList());

    var pointDisplays = rallyingPoints.Select(r =>
      {
        var pointLianes = pointsWithLianes.GetValueOrDefault(r.Id!, ImmutableList<Api.Trip.Liane>.Empty);
        return new PointDisplay(r, pointLianes);
      })
      .ToImmutableList();

    var rawLianeSegments = await lianes.GroupBy(l => l.WayPoints)
      .SelectAsync(async g =>
      {
        var route = await routingService.GetRoute(g.Key.Select(w => w.RallyingPoint.Location).ToImmutableList());
        return new LianeSegment(route.Coordinates, g.Select(l => (Ref<Api.Trip.Liane>)l.Id).ToImmutableList());
      });

    var lianeSegments = TruncateOverlappingSegments(rawLianeSegments);

    return new LianeDisplay(pointDisplays, lianeSegments);
  }

  internal readonly struct LianeSet
  {
    public LianeSet(IEnumerable<Ref<Api.Trip.Liane>> lianes)
    {
      HashKey = string.Join("_", lianes.Select(r => r.Id).Distinct().Order());
    }

    public ImmutableList<Ref<Api.Trip.Liane>> Lianes => HashKey.Split("_").Select(id => (Ref<Api.Trip.Liane>)id).ToImmutableList();
    public string HashKey { get; }

    public LianeSet Merge(LianeSet other)
    {
      return new LianeSet(other.Lianes.Concat(Lianes));
    }
  }

  private async Task<LianeMatch?> MatchLiane(LianeDb lianeDb, RallyingPoint from, RallyingPoint to, Filter filter)
  {
    var matchForDriver = filter.AvailableSeats > 0;
    var defaultDriver = lianeDb.Driver.User;
    var (driverSegment, segments) = ExtractRouteSegments(defaultDriver, lianeDb.Members);
    var wayPoints = (await routingService.GetTrip(driverSegment, segments))!;
    var initialTripDuration = wayPoints.TotalDuration();

    if (filter.TargetTime.Direction == Direction.Arrival && lianeDb.DepartureTime.AddSeconds(initialTripDuration) > filter.TargetTime.DateTime)
    {
      // For filters on arrival types, filter here using trip duration
      return null;
    }

    ImmutableSortedSet<WayPoint> newWayPoints;
    Match match;
    if (wayPoints.IncludesSegment((from, to)))
    {
      newWayPoints = wayPoints;
      match = new Match.Exact();
    }
    else
    {
      // If match for a driver, use the candidate segment as driverSegment
      var matchDriverSegment = matchForDriver ? (from, to) : driverSegment;
      var matchSegments = matchForDriver ? segments.Append(driverSegment) : segments.Append((from, to));
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

      match = new Match.Compatible(delta);
    }

    var originalLiane = new Api.Trip.Liane(lianeDb.Id, lianeDb.CreatedBy!, lianeDb.CreatedAt, lianeDb.DepartureTime, lianeDb.ReturnTime, wayPoints, lianeDb.Members, lianeDb.Driver);
    return new LianeMatch(originalLiane, newWayPoints, lianeDb.TotalSeatCount, match);
  }

  private static ImmutableList<LianeSegment> TruncateOverlappingSegments(ImmutableList<LianeSegment> raw)
  {
    var cutCoordinate = new LngLatTuple(-1, -1);
    var groupedCoordinates = new Dictionary<LngLatTuple, LianeSet>();
    var orderedCoordinates = new List<LngLatTuple>();
    foreach (var lianeSegment in raw)
    {
      var lianeSet = new LianeSet(lianeSegment.Lianes.ToHashSet());
      foreach (var coordinate in lianeSegment.Coordinates)
      {
        if (groupedCoordinates.TryGetValue(coordinate, out var currentLianeSet))
        {
          groupedCoordinates[coordinate] = lianeSet.Merge(currentLianeSet);
          orderedCoordinates.Add(cutCoordinate);
        }
        else
        {
          groupedCoordinates[coordinate] = lianeSet;
          orderedCoordinates.Add(coordinate);
        }
      }
    }

    var lianeSegments = new List<LianeSegment>();
    var coordinates = new List<LngLatTuple>();
    LianeSet? previousLianeSet = null;
    foreach (var coordinate in orderedCoordinates)
    {
      if (coordinate.Equals(cutCoordinate))
      {
        // Special case the route is already truncated because is crossing another route
        if (previousLianeSet != null)
        {
          var lianeSegment = new LianeSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Lianes);
          lianeSegments.Add(lianeSegment);
        }

        coordinates.Clear();
        previousLianeSet = null;
        continue;
      }

      var currentLianeSet = groupedCoordinates[coordinate];
      if (previousLianeSet != null && currentLianeSet.HashKey != previousLianeSet.Value.HashKey)
      {
        var lianeSegment = new LianeSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Lianes);
        lianeSegments.Add(lianeSegment);
        coordinates.Clear();
      }

      coordinates.Add(coordinate);
      previousLianeSet = currentLianeSet;
    }

    if (coordinates.Count > 0 && previousLianeSet != null)
    {
      var lianeSegment = new LianeSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Lianes);
      lianeSegments.Add(lianeSegment);
    }

    return lianeSegments.ToImmutableList();
  }
}