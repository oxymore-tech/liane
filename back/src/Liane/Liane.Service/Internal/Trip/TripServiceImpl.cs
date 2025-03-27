using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Trip.Geolocation;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using Direction = Liane.Api.Trip.Direction;
using LianeMatch = Liane.Api.Trip.LianeMatch;
using Match = Liane.Api.Trip.Match;

namespace Liane.Service.Internal.Trip;

public sealed class TripServiceImpl(
  IMongoDatabase mongo,
  IRoutingService routingService,
  ICurrentContext currentContext,
  IRallyingPointService rallyingPointService,
  ILogger<TripServiceImpl> logger,
  IUserService userService,
  IPostgisService postgisService,
  IUserStatService userStatService,
  LianeTrackerCache trackerCache,
  EventDispatcher eventDispatcher)
  : BaseMongoCrudService<LianeDb, Api.Trip.Trip>(mongo), ITripService
{
  private const int MaxDeltaInSeconds = 15 * 60; // 15 min
  private const int MaxDepositDeltaInMeters = 2000;
  private const int LianeMatchPageDeltaInHours = 24;

  public async Task<Api.Trip.Trip> Create(TripRequest entity, Ref<Api.Auth.User>? owner = null)
  {
    var createdBy = owner ?? currentContext.CurrentUser().Id;
    var createdAt = DateTime.UtcNow;

    var toCreate = new List<LianeDb>();

    string? returnId = null;
    if (entity.ReturnAt is not null)
    {
      returnId = ObjectId.GenerateNewId().ToString()!;
      var createdReturn = await ToDb(
        entity with { From = entity.To, To = entity.From },
        new DepartureOrArrivalTime(entity.ReturnAt.Value, Direction.Departure),
        returnId,
        createdAt,
        createdBy
      );
      toCreate.Add(createdReturn);
    }

    var created = await ToDb(entity, new DepartureOrArrivalTime(entity.ArriveAt, Direction.Arrival), ObjectId.GenerateNewId().ToString()!, createdAt, createdBy);
    toCreate.Add(entity.ReturnAt is null ? created : created with { Return = returnId });

    await Mongo.GetCollection<LianeDb>().InsertManyAsync(toCreate);
    foreach (var lianeDb in toCreate)
    {
      var liane = await Get(lianeDb.Id);
      await postgisService.UpdateGeometry(liane);
    }

    await userStatService.IncrementTotalCreatedTrips(createdBy);
    await rallyingPointService.UpdateStats([entity.From, entity.To], entity.ReturnAt ?? created.DepartureTime, entity.ReturnAt is null ? 1 : 2);

    var trip = await Get(created.Id);

    await eventDispatcher.Dispatch(trip.Liane, new MessageContent.TripAdded("", trip, returnId), createdAt);

    return trip;
  }

  public async Task<ImmutableList<Api.Trip.Trip>> GetIncomingTrips(IEnumerable<Ref<Api.Community.Liane>> lianeFilter)
  {
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    var start = new DateTime(today, new TimeOnly(), DateTimeKind.Utc);
    var end = new DateTime(today.AddDays(6), new TimeOnly(23, 59, 59), DateTimeKind.Utc);
    return await Collection.Find(l =>
        lianeFilter.Contains(l.Liane)
        && (l.State == TripStatus.NotStarted || l.State == TripStatus.Started)
        && l.DepartureTime > start
        && l.DepartureTime <= end)
      .SortBy(l => l.DepartureTime)
      .SelectAsync(MapEntity);
  }


  public async Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination, CancellationToken cancellationToken = default)
  {
    var from = await rallyingPointService.Get(filter.From);
    var to = await rallyingPointService.Get(filter.To);

    logger.LogDebug("Match lianes from '{From}' to '{To}' - '{TargetTime}'", from.Label, to.Label, filter.TargetTime);

    if (from.Equals(to))
    {
      throw new ValidationException("To", ValidationMessage.WrongFormat);
    }

    var targetRoute = await routingService.GetRoute(ImmutableList.Create(from.Location, to.Location), cancellationToken);
    DateTime lowerBound, upperBound;
    if (filter.TargetTime.Direction == Direction.Departure)
    {
      lowerBound = filter.TargetTime.At;
      upperBound = filter.TargetTime.At.AddHours(LianeMatchPageDeltaInHours);
    }
    else
    {
      lowerBound = filter.TargetTime.At.AddHours(-LianeMatchPageDeltaInHours);
      upperBound = filter.TargetTime.At;
    }

    var timer = new Stopwatch();
    timer.Start();

    var results =
      await postgisService.GetMatchingLianes(from.Location, to.Location, lowerBound, upperBound);
    results = results.Concat(await postgisService.GetMatchingLianes(targetRoute, lowerBound, upperBound)).ToImmutableList();

    timer.Stop();
    logger.LogDebug("Posgis match {count} lianes in {Elapsed} ms", results.Count, timer.ElapsedMilliseconds);

    var resultDict = results.GroupBy(r => r.Liane).ToDictionary(g => g.Key, g => g.ToImmutableList());

    var isDriverSearch = Builders<LianeDb>.Filter.Eq(l => l.Driver.CanDrive, filter.AvailableSeats <= 0);

    var hasAvailableSeats = Builders<LianeDb>.Filter.Gte(l => l.TotalSeatCount, -filter.AvailableSeats);

    // var userIsMember = Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == currentContext.CurrentUser().Id);

    timer.Restart();
    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(isDriverSearch & hasAvailableSeats & Builders<LianeDb>.Filter.In(l => l.Id, resultDict.Keys.Select(k => (string)k)))
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
    var segments = await GetLianeSegments(matches.Data.Select(m => m.Trip with { WayPoints = m.GetMatchingTrip() }));
    return new LianeMatchDisplay(new FeatureCollection(segments.ToFeatures().ToList()), matches.Data);
  }

  public async Task<PaginatedResponse<Api.Trip.Trip>> List(TripFilter tripFilter, Pagination pagination, CancellationToken cancellationToken = default)
  {
    var filter = BuildFilter(tripFilter);
    var paginatedLianes = await Collection.PaginateTime(pagination, l => l.DepartureTime, filter, cancellationToken: cancellationToken);
    if (tripFilter is { States.Length: > 0 })
    {
      paginatedLianes = paginatedLianes.Where(l => tripFilter.States.Contains(l.State));
    }

    return await paginatedLianes.SelectAsync(MapEntity) with { TotalCount = await Count(filter) };
  }

  private FilterDefinition<LianeDb> BuildFilter(TripFilter tripFilter)
  {
    FilterDefinition<LianeDb> filter;
    if (tripFilter.ForCurrentUser)
    {
      var currentUser = currentContext.CurrentUser();
      filter = GetAccessLevelFilter(currentUser.Id, ResourceAccessLevel.Member);
    }

    else filter = FilterDefinition<LianeDb>.Empty;

    if (tripFilter.States?.Length > 0)
    {
      filter &= (Builders<LianeDb>.Filter.In(l => l.State, tripFilter.States)
                 | Builders<LianeDb>.Filter.Eq(l => l.State, TripStatus.Started)
                 | Builders<LianeDb>.Filter.Eq(l => l.State, TripStatus.Finished));
    }

    return filter;
  }

  private async Task<LianeDb> ToDb(TripRequest tripRequest, DepartureOrArrivalTime at, string originalId, DateTime createdAt, string createdBy)
  {
    if (tripRequest.From == tripRequest.To)
    {
      throw new ValidationException("To", ValidationMessage.WrongFormat);
    }

    var members = new List<TripMember> { new(createdBy, tripRequest.From, tripRequest.To, tripRequest.AvailableSeats, GeolocationLevel: GeolocationLevel.None) };
    var driverData = new Driver(createdBy, tripRequest.AvailableSeats > 0);
    var wayPoints = await GetWayPoints(at, driverData.User, members);
    var wayPointDbs = wayPoints.Select(w => new WayPointDb(w.RallyingPoint, w.Duration, w.Distance, w.Eta)).ToImmutableList();
    return new LianeDb(originalId, createdBy, createdAt, wayPoints[0].Eta, null, members.ToImmutableList(), driverData,
      TripStatus.NotStarted, wayPointDbs, ImmutableList<UserPing>.Empty, tripRequest.Liane);
  }

  public async Task<Api.Trip.Trip> AddMember(Ref<Api.Trip.Trip> tripId, TripMember newMember)
  {
    var member = new TripMember(newMember.User, newMember.From, newMember.To);
    var trip = await AddMemberSingle(tripId, member);
    await userStatService.IncrementTotalJoinedTrips(newMember.User);
    if (!newMember.TakeReturnTrip)
    {
      return trip;
    }

    await AddMemberSingle(trip.Return!, member with { From = newMember.To, To = newMember.From });
    await userStatService.IncrementTotalJoinedTrips(newMember.User);

    await eventDispatcher.Dispatch(trip.Liane, new MessageContent.MemberJoinedTrip("", newMember.User, trip, newMember.TakeReturnTrip));

    return trip;
  }

  public async Task CancelAllTrips(Ref<Api.Auth.User> member)
  {
    // Delete unstarted lianes
    await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Driver.User == member.Id && l.State == TripStatus.NotStarted)
      .ForEachAsync(async (l) => await Delete(l.Id));

    // Cancel ongoing trips where user is driver
    await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Driver.User == member.Id && l.State == TripStatus.Started)
      .ForEachAsync(async (l) => await CancelTrip(l.Id));

    // Leave liane not yet started and joined as members
    await Mongo.GetCollection<LianeDb>()
      .Find(
        Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == member.Id) &
        Builders<LianeDb>.Filter.Eq(l => l.State, TripStatus.NotStarted))
      .ForEachAsync(async (l) => await RemoveMember(l.Id, member.Id));

    // Cancel participation to ongoing trips joined as members
    await Mongo.GetCollection<LianeDb>()
      .Find(
        Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == member.Id) &
        Builders<LianeDb>.Filter.Eq(l => l.State, TripStatus.Started))
      .ForEachAsync(async (l) => await CancelTrip(l.Id));
  }

  public async Task<Api.Trip.Trip?> RemoveMember(Ref<Api.Trip.Trip> liane, Ref<Api.Auth.User> member)
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

    var newMembers = toUpdate.Members.Remove(foundMember);

    if (newMembers.IsEmpty)
    {
      await Delete(liane);
      return null;
    }

    var newDriver = toUpdate.Driver.User == foundMember.User
      ? newMembers.First().User
      : toUpdate.Driver.User;

    var update = (await GetTripUpdate(toUpdate.DepartureTime, newDriver, newMembers))
      .Pull(l => l.Members, foundMember)
      .Set(l => l.TotalSeatCount, toUpdate.TotalSeatCount - foundMember.SeatCount);

    var updated = await Update(liane, update);

    var updatedLiane = await MapEntity(updated);
    await postgisService.UpdateGeometry(updatedLiane);

    await eventDispatcher.Dispatch(updatedLiane.Liane, new MessageContent.MemberLeftTrip("", foundMember.User, updatedLiane));

    return updatedLiane;
  }

  public async Task<Match?> GetNewTrip(Ref<Api.Trip.Trip> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment)
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

  public async Task UpdateFeedback(Ref<Api.Trip.Trip> liane, Feedback feedback)
  {
    var resolved = await Get(liane);
    var sender = currentContext.CurrentUser().Id;
    var updated = await Update(liane, Builders<LianeDb>.Update.Set(l => l.Members, resolved.Members.Select(m => m.User.Id == sender ? m with { Feedback = feedback } : m)));
    if (updated.Members.All(m => m.Feedback is not null))
    {
      await Update(liane, Builders<LianeDb>.Update.Set(l => l.State, updated.Members.All(m => m.Feedback!.Canceled) ? TripStatus.Canceled : TripStatus.Archived));
    }
  }

  private async Task<Api.Trip.Trip> AddMemberSingle(Ref<Api.Trip.Trip> liane, TripMember newMember)
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
      throw new ValidationException(ValidationMessage.AlreadyMember);
    }

    var updateDef = (await GetTripUpdate(toUpdate.DepartureTime, toUpdate.Driver.User, toUpdate.Members.Add(newMember)))
      .Push(l => l.Members, newMember)
      .Set(l => l.TotalSeatCount, toUpdate.TotalSeatCount + newMember.SeatCount);

    var updated = await Update(liane, updateDef);

    var pointsToUpdate = new[] { newMember.From, newMember.To }.Where(r => toUpdate.WayPoints.Find(w => w.RallyingPoint.Id == r.Id) is null).ToImmutableList();
    if (pointsToUpdate.Any()) await rallyingPointService.UpdateStats(pointsToUpdate, updated.DepartureTime);

    var updatedLiane = await MapEntity(updated);
    await postgisService.UpdateGeometry(updatedLiane);

    return updatedLiane;
  }

  public async Task<string> GetContact(Ref<Api.Trip.Trip> id, Ref<Api.Auth.User> requester, Ref<Api.Auth.User> member)
  {
    var liane = await Get(id);
    if ((requester.Id != liane.Driver.User.Id || liane.Members.All(m => m.User.Id != member))
        && (member.Id != liane.Driver.User.Id || liane.Members.All(m => m.User.Id != requester)))
    {
      throw new ForbiddenException();
    }

    var m = await userService.GetFullUser(member);
    return m.Phone;
  }

  private async Task<ImmutableList<WayPoint>> GetWayPoints(DepartureOrArrivalTime at, Ref<Api.Auth.User> driver, IEnumerable<TripMember> lianeMembers)
  {
    var (driverSegment, segments) = await ExtractRouteSegments(driver, lianeMembers);
    var result = await routingService.GetTrip(at, driverSegment, segments);
    if (result == null)
    {
      throw new ValidationException("members", ValidationMessage.WrongFormat);
    }

    return result;
  }

  private async Task<(RouteSegment, ImmutableList<RouteSegment>)> ExtractRouteSegments(Ref<Api.Auth.User> driver, IEnumerable<TripMember> lianeMembers)
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
      throw new ValidationException(nameof(from), ValidationMessage.Required);
    }

    return ((from, to), segments.ToImmutableList());
  }

  protected override async Task<Api.Trip.Trip> MapEntity(LianeDb liane)
  {
    var wayPoints = await liane.WayPoints.SelectAsync(async w =>
    {
      var rallyingPoint = await rallyingPointService.Get(w.RallyingPoint);
      return new WayPoint(rallyingPoint, w.Duration, w.Distance, w.Eta);
    });
    var users = await liane.Members.SelectAsync(async m => m with { User = await userService.Get(m.User) });
    return new Api.Trip.Trip(liane.Id, liane.Liane!, liane.CreatedBy!, liane.CreatedAt, liane.DepartureTime, liane.Return, wayPoints, users, liane.Driver, liane.State);
  }

  private async Task<ImmutableList<LianeSegment>> GetLianeSegments(IEnumerable<Api.Trip.Trip> lianes)
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
      return new LianeSegment(route.Coordinates, g.Select(s => (Ref<Api.Trip.Trip>)s.liane.Id).ToImmutableList());
    }, parallel: true);

    timer.Stop();
    logger.LogDebug("Fetching waypoints segments : {Elapsed}", timer.Elapsed);
    timer.Restart();
    var lianeSegments = RouteOptimizer.TruncateOverlappingSegments(rawWayPointsSegments);
    timer.Stop();
    logger.LogDebug("Computing overlap : {Elapsed}", timer.Elapsed);
    return lianeSegments;
  }

  private async Task<UpdateDefinition<LianeDb>> GetTripUpdate(DateTime departureTime, Ref<Api.Auth.User> driver, IEnumerable<TripMember> members)
  {
    var wayPoints = await GetWayPoints(new DepartureOrArrivalTime(departureTime, Direction.Departure), driver, members);
    return Builders<LianeDb>.Update
      .Set(l => l.WayPoints, wayPoints.ToDb());
  }

  private async Task<LianeMatch?> MatchLiane(LianeDb lianeDb, Filter filter, ImmutableList<LianeMatchCandidate> candidates, ImmutableList<LatLng> targetRoute)
  {
    var matchForDriver = filter.AvailableSeats > 0;
    var defaultDriver = lianeDb.Driver.User;

    var liane = await MapEntity(lianeDb);
    var initialTripDuration = liane.WayPoints.TotalDuration();
    if (filter.TargetTime.Direction == Direction.Arrival && lianeDb.DepartureTime.AddSeconds(initialTripDuration) > filter.TargetTime.At)
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
      DateTime? returnTime = null;
      if (liane.Return is not null)
      {
        var compatibleReturnTrip = await Mongo.GetCollection<LianeDb>()
          .Find(p => p.Id == liane.Return && p.TotalSeatCount >= -filter.AvailableSeats)
          .FirstOrDefaultAsync();
        returnTime = compatibleReturnTrip.WayPoints.Find(w => w.RallyingPoint.Id == depositPoint.Id)?.Eta;
      }

      return new LianeMatch(liane, lianeDb.TotalSeatCount, returnTime, match);
    }

    // Try detour first, otherwise fallback to partial match
    var detourCandidate = candidates.Find(c => c.Mode == MatchResultMode.Detour);
    var partialCandidate = candidates.Find(c => c.Mode == MatchResultMode.Partial);

    foreach (var candidate in new List<LianeMatchCandidate?> { detourCandidate, partialCandidate }.Where(c => c is not null))
    {
      pickupPoint = await rallyingPointService.Snap(candidate!.Pickup, 1500);
      depositPoint = await rallyingPointService.Snap(candidate.Deposit, 1500);

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
      var maxBound = filter.MaxDeltaInSeconds ?? Math.Min(initialTripDuration * 0.25 + 90, MaxDeltaInSeconds);
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

      if (liane.Return is null)
      {
        return new LianeMatch(liane, lianeDb.TotalSeatCount, null, compatibleMatch);
      }

      var compatibleReturnTrip = await Mongo.GetCollection<LianeDb>()
        .Find(p => p.Id == liane.Return && p.TotalSeatCount >= -filter.AvailableSeats)
        .FirstOrDefaultAsync();
      var returnTime = compatibleReturnTrip.WayPoints.Find(w => w.RallyingPoint.Id == depositPoint.Id)?.Eta;

      return new LianeMatch(liane, lianeDb.TotalSeatCount, returnTime, compatibleMatch);
    }

    return null;
  }

  public async Task<Api.Trip.Trip> UpdateDepartureTime(Ref<Api.Trip.Trip> liane, DateTime departureTime)
  {
    var found = await Mongo.GetCollection<LianeDb>()
      .Find(p => p.Id == liane.Id)
      .FirstOrDefaultAsync();
    var delta = departureTime - found!.DepartureTime;
    found = found with { DepartureTime = departureTime, WayPoints = found.WayPoints.Select(w => w with { Eta = w.Eta + delta }).ToImmutableList() };

    await Mongo.GetCollection<LianeDb>()
      .ReplaceOneAsync(l => l.Id == liane.Id, found);
    var updated = await MapEntity(found);

    await postgisService.UpdateGeometry(updated);
    return updated;
  }

  public async Task UpdateState(Ref<Api.Trip.Trip> liane, TripStatus state)
  {
    var lianeDb = await Update(liane, Builders<LianeDb>.Update.Set(l => l.State, state));
    if (lianeDb.State != TripStatus.NotStarted)
    {
      // Remove liane from potential search results
      await postgisService.Clear([
        liane.Id
      ]);
      if (lianeDb.State != TripStatus.Started)
      {
        var doneSession = trackerCache.RemoveTracker(liane.Id);
        if (doneSession is not null)
        {
          await doneSession.Dispose();
        }
      }
    }

    if (lianeDb.State == TripStatus.Archived)
    {
      // Count one more done trip
      // TODO count avoided carbon emissions
      await userStatService.IncrementTotalTrips(lianeDb.CreatedBy!, 0);
    }

    switch (lianeDb.State)
    {
      case TripStatus.Archived:
        await eventDispatcher.Dispatch(lianeDb.Liane!, new MessageContent.TripArchived(lianeDb.Id));
        break;
      case TripStatus.Finished:
        await eventDispatcher.Dispatch(lianeDb.Liane!, new MessageContent.TripFinished(lianeDb.Id));
        break;
    }
  }

  public async Task<FeatureCollection> GetRawGeolocationPings(Ref<Api.Trip.Trip> liane)
  {
    var lianeDb = await Mongo.GetCollection<LianeDb>().Find(l => l.Id == liane.Id).FirstOrDefaultAsync();
    var features = lianeDb.Pings
      .Where(ping => ping.Coordinate is not null)
      .Select(ping => new Feature(
        new Point(new Position(ping.Coordinate!.Value.Lat, ping.Coordinate!.Value.Lng)),
        new Dictionary<string, object> { ["user"] = ping.User.Id, ["at"] = ping.At }
      ))
      .ToList();
    return new FeatureCollection(features);
  }

  public async Task UpdateGeolocationSetting(Ref<Api.Trip.Trip> liane, GeolocationLevel level)
  {
    var resolved = await Get(liane);
    var sender =
      currentContext.CurrentUser().Id;
    var updated = await Update(liane, Builders<LianeDb>.Update.Set(l => l.Members, resolved.Members.Select(m => m.User.Id == sender ? m with { GeolocationLevel = level } : m)));

    await eventDispatcher.Dispatch(updated.Liane!, new MessageContent.GeolocationLevelChanged(updated.Id, level));
  }

  public async Task CancelTrip(Ref<Api.Trip.Trip> tripRef)
  {
    var trip = await Get(tripRef);
    var sender = currentContext.CurrentUser().Id;
    var now = DateTime.UtcNow;

    var alreadyCanceled = trip.Members.FirstOrDefault(m => m.User.Id == sender && m.Cancellation is not null);
    if (alreadyCanceled is not null)
    {
      return;
    }

    if (sender == trip.Driver.User)
    {
      await UpdateState(trip, TripStatus.Canceled);
    }

    await Update(tripRef, Builders<LianeDb>.Update.Set(l => l.Members, trip.Members.Select(m => m.User.Id == sender ? m with { Cancellation = now } : m)));

    await eventDispatcher.Dispatch(trip.Liane, new MessageContent.MemberLeftTrip("", sender, trip));
  }
  
  public async Task FinishTrip(Ref<Api.Trip.Trip> tripRef, Ref<Api.Auth.User> user)
  {
    var trip = await Get(tripRef);
    var now = DateTime.UtcNow;

    var alreadyCanceled = trip.Members.FirstOrDefault(m => m.User.Id == user.Id && m.Arrival is not null);
    if (alreadyCanceled is not null)
    {
      return;
    }

    if (user == trip.Driver.User)
    {
      await UpdateState(trip, TripStatus.Finished);
    }

    await Update(tripRef, Builders<LianeDb>.Update.Set(l => l.Members, trip.Members.Select(m => m.User.Id == user ? m with { Arrival = now } : m)));
  }

  public async Task StartTrip(Ref<Api.Trip.Trip> tripRef)
  {
    var trip = await Get(tripRef);
    var sender = currentContext.CurrentUser().Id;
    var now = DateTime.UtcNow;

    var alreadyStarted = trip.Members.FirstOrDefault(m => m.User.Id == sender && m.Departure is not null);
    if (alreadyStarted is not null)
    {
      return;
    }

    if (trip.State == TripStatus.NotStarted)
    {
      await UpdateState(trip, TripStatus.Started);
    }

    await Update(tripRef, Builders<LianeDb>.Update.Set(l => l.Members, trip.Members.Select(m => m.User.Id == sender ? m with { Departure = now } : m)));

    await eventDispatcher.Dispatch(trip.Liane, new MessageContent.MemberHasStarted("", trip), now);
  }

  public async Task<PaginatedResponse<DetailedLianeTrackReport>> ListTripRecords(Pagination pagination, TripRecordFilter filter)
  {
    var mongoFilter = Builders<DetailedLianeTrackReportDb>.Filter.Exists(l => l.Liane);
    if (filter.Date is not null)
    {
      mongoFilter &= Builders<DetailedLianeTrackReportDb>.Filter.Gte(r => r.StartedAt, filter.Date.Value) &
                     Builders<DetailedLianeTrackReportDb>.Filter.Lte(r => r.StartedAt, filter.Date.Value.AddHours(24));
    }

    if (filter.Members is not null)
    {
      foreach (var requiredMember in filter.Members)
      {
        mongoFilter &= Builders<DetailedLianeTrackReportDb>.Filter.ElemMatch(r => r.Liane.Members, m => requiredMember == m.User);
      }
    }

    if (filter.WayPoints is not null)
    {
      foreach (var requiredPoint in filter.WayPoints)
      {
        mongoFilter &= Builders<DetailedLianeTrackReportDb>.Filter.ElemMatch(r => r.Liane.WayPoints, m => m.RallyingPoint == requiredPoint);
      }
    }

    var reports = await Mongo.GetCollection<LianeTrackReport>()
      .PaginateTime<LianeTrackReport, DetailedLianeTrackReportDb>(
        pagination,
        l => l.StartedAt,
        fluent => fluent
          .JoinOneToOne<LianeTrackReport, LianeDb>("liane")
          .Project<DetailedLianeTrackReportDb>(Builders<BsonDocument>.Projection.Exclude("memberLocations").Exclude("carLocations"))
          .Match(mongoFilter)
      );

    return await reports.SelectAsync(MapLianeTrackReport);
  }

  private async Task<DetailedLianeTrackReport> MapLianeTrackReport(DetailedLianeTrackReportDb r)
  {
    var liane = await MapEntity(r.Liane);
    return new DetailedLianeTrackReport(r.Id, liane.WayPoints, liane.Members, liane.Driver, r.StartedAt, r.FinishedAt);
  }

  public async Task<DetailedLianeTrackReport> GetTripRecord(string id)
  {
    var report = await Mongo.GetCollection<LianeTrackReport>()
      .Aggregate()
      .Match(l => l.Id == id)
      .JoinOneToOne<LianeTrackReport, LianeDb>("liane")
      .Project<DetailedLianeTrackReportDb>(Builders<BsonDocument>.Projection.Exclude("memberLocations").Exclude("carLocations"))
      .Match(Builders<DetailedLianeTrackReportDb>.Filter.Exists(l => l.Liane))
      .FirstOrDefaultAsync();
    if (report is null) throw new ResourceNotFoundException("LianeTrackReport " + id);
    return await MapLianeTrackReport(report);
  }
}