using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Linq;
using System.Linq.Expressions;
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
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed class LianeServiceImpl : BaseMongoCrudService<LianeDb, Api.Trip.Liane>, ILianeService
{
  private const int MaxDeltaInSeconds = 15 * 60; // 15 min
  private const int MaxDepositDeltaInMeters = 2000;
  private const int LianeMatchPageDeltaInHours = 24;

  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly IUserService userService;
  private readonly IChatService chatService;
  private readonly ICurrentContext currentContext;
  private readonly IPostgisService postgisService;
  private readonly ILianeRecurrenceService lianeRecurrenceService;
  private readonly ILogger<LianeServiceImpl> logger;
  private readonly ILianeUpdateObserver lianeUpdateObserver;

  public LianeServiceImpl(
    IMongoDatabase mongo,
    IRoutingService routingService,
    ICurrentContext currentContext,
    IRallyingPointService rallyingPointService,
    IChatService chatService,
    ILogger<LianeServiceImpl> logger, IUserService userService, IPostgisService postgisService, ILianeRecurrenceService lianeRecurrenceService, ILianeUpdateObserver lianeUpdateObserver) : base(mongo)
  {
    this.routingService = routingService;
    this.currentContext = currentContext;
    this.rallyingPointService = rallyingPointService;
    this.chatService = chatService;
    this.logger = logger;
    this.userService = userService;
    this.postgisService = postgisService;
    this.lianeRecurrenceService = lianeRecurrenceService;
    this.lianeUpdateObserver = lianeUpdateObserver;
  }

  public async Task<Api.Trip.Liane> Create(LianeRequest entity, Ref<Api.User.User>? owner = null)
  {
    var createdBy = owner ?? currentContext.CurrentUser().Id;
    if (entity.Recurrence is null)
    {
      return await CreateWithReturn(entity, createdBy, null);
    }

    var recurrence = await lianeRecurrenceService.Create(LianeRecurrence.FromLianeRequest(entity), owner);
    Api.Trip.Liane? liane = null;
    if (currentContext.AllowPastResourceCreation() || entity.DepartureTime > DateTime.UtcNow)
    {
      liane = await CreateWithReturn(entity, createdBy, recurrence);
    }

    var created = await CreateFromRecurrence(recurrence, createdBy);
    return liane ?? created.First();
  }

  public async Task<ImmutableList<Api.Trip.Liane>> CreateFromRecurrence(Ref<LianeRecurrence> recurrence, Ref<Api.User.User>? owner = null, int daysAhead = 7)
  {
    var createdBy = owner ?? currentContext.CurrentUser().Id;
    var recurrenceResolved = await lianeRecurrenceService.Get(recurrence);

    var now = DateTime.UtcNow;

    var existing = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Recurrence == recurrence.Id && l.DepartureTime > now)
      .Sort(Builders<LianeDb>.Sort.Descending(m => m.DepartureTime))
      .Limit(daysAhead)
      .SelectAsync(MapEntity);

    var entity = recurrenceResolved.GetLianeRequest();
    var createdLianes = new List<Api.Trip.Liane>();

    // Only plan up to given days ahead
    var fromDate = new DateTime(now.Year, now.Month, now.Day, entity.DepartureTime.Hour, entity.DepartureTime.Minute, entity.DepartureTime.Second, DateTimeKind.Utc);
    var dReturn = entity.ReturnTime is not null ? entity.ReturnTime - entity.DepartureTime : null;
    foreach (var nextOccurence in entity.Recurrence!.Value.GetNextActiveDates(fromDate, DateTime.UtcNow.Date.AddDays(daysAhead)))
    {
      if (existing.Find(l => l.DepartureTime.ToShortDateString() == nextOccurence.ToShortDateString()) is not null)
      {
        continue;
      }

      var returnTime = entity.ReturnTime is not null ? nextOccurence + dReturn : null;
      var created = await CreateWithReturn(entity with { DepartureTime = nextOccurence, ReturnTime = returnTime }, createdBy, recurrence);
      createdLianes.Add(created);
    }

    return createdLianes.ToImmutableList();
  }

  private async Task<Api.Trip.Liane> CreateWithReturn(LianeRequest entity, Ref<Api.User.User> createdBy, Ref<LianeRecurrence>? recurrence)
  {
    var createdAt = DateTime.UtcNow;

    var toCreate = new List<LianeDb>();
    // Handle return here
    if (entity.ReturnTime is not null)
    {
      var createdReturn = await ToDb(
        new LianeRequest(null, entity.ReturnTime.Value, null, entity.AvailableSeats, entity.To, entity.From),
        ObjectId.GenerateNewId().ToString()!,
        createdAt,
        createdBy,
        recurrence
      );
      toCreate.Add(createdReturn);
    }

    var created = await ToDb(entity with { ReturnTime = null }, ObjectId.GenerateNewId().ToString()!, createdAt, createdBy, recurrence);
    toCreate.Add(entity.ReturnTime is null ? created : created with { Return = toCreate[0].Id });

    if (!currentContext.AllowPastResourceCreation())
    {
      toCreate = toCreate.Where(l => l.DepartureTime > createdAt).ToList();
    }

    if (toCreate.Count == 0)
    {
      throw new ArgumentException($"Cannot create liane with departure time: {entity.DepartureTime}");
    }

    await Mongo.GetCollection<LianeDb>().InsertManyAsync(toCreate);
    foreach (var lianeDb in toCreate)
    {
      var liane = await Get(lianeDb.Id);
      await postgisService.UpdateGeometry(liane);
    }

    return await Get(created.Id);
  }

  private async Task<LianeDb> ToDb(LianeRequest lianeRequest, string originalId, DateTime createdAt, string createdBy, Ref<LianeRecurrence>? recurrence)
  {
    if (lianeRequest.From == lianeRequest.To)
    {
      throw new ValidationException("To", ValidationMessage.HasWrongFormat);
    }

    var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To, lianeRequest.AvailableSeats) };
    var driverData = new Driver(createdBy, lianeRequest.AvailableSeats > 0);
    var wayPoints = await GetWayPoints(lianeRequest.DepartureTime, driverData.User, members);
    var wayPointDbs = wayPoints.Select(w => new WayPointDb(w.RallyingPoint, w.Duration, w.Distance, w.Eta)).ToImmutableList();
    return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime, null, members.ToImmutableList(), driverData,
      LianeState.NotStarted, wayPointDbs, ImmutableList<UserPing>.Empty, null, recurrence);
  }

  public async Task<Api.Trip.Liane> GetForCurrentUser(Ref<Api.Trip.Liane> l, Ref<Api.User.User>? user = null)
  {
    var target = user ?? currentContext.CurrentUser().Id;
    var liane = await Get(l);
      var member = liane.Members.Find(m => m.User.Id == target)!;
      return liane with { State = LianeStatusUpdate.GetUserState(liane, member) };
  }

  public async Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination, CancellationToken cancellationToken = default)
  {
    var from = await rallyingPointService.Get(filter.From);
    var to = await rallyingPointService.Get(filter.To);

    logger.LogDebug("Match lianes from '{From}' to '{To}' - '{TargetTime}'", from.Label, to.Label, filter.TargetTime);

    if (from.Equals(to))
    {
      throw new ValidationException("To", ValidationMessage.HasWrongFormat);
    }

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
    var segments = await GetLianeSegments(matches.Data.Select(m => m.Liane with { WayPoints = m.GetMatchingTrip() }));
    return new LianeMatchDisplay(new FeatureCollection(segments.ToFeatures().ToList()), matches.Data);
  }

  public async Task<PaginatedResponse<Api.Trip.Liane>> List(LianeFilter lianeFilter, Pagination pagination, CancellationToken cancellationToken = default)
  {
    var filter = BuildFilter(lianeFilter);
    var paginatedLianes = await Mongo.Paginate<LianeDb, Cursor.Time>(pagination, l => l.DepartureTime, filter, cancellationToken: cancellationToken);
    if (lianeFilter is { ForCurrentUser: true, States.Length: > 0 })
    {
      // Return with user's version of liane state
      var result = await paginatedLianes.SelectAsync(async l => l with { State = LianeStatusUpdate.GetUserState(await MapEntity(l), l.Members.Find(m => m.User.Id == currentContext.CurrentUser().Id)!) });
      paginatedLianes = result.Where(l => lianeFilter.States.Contains(l.State));
    }

    return await paginatedLianes.SelectAsync(MapEntity);
  }

  private FilterDefinition<LianeDb> BuildFilter(LianeFilter lianeFilter)
  {
    FilterDefinition<LianeDb> filter;
    if (lianeFilter.ForCurrentUser)
    {
      var currentUser = currentContext.CurrentUser();
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
      }, DateTime.UtcNow), toUpdate.CreatedBy!);
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
    await PushUpdate(updated);
    return updatedLiane;
  }

  public async Task RemoveMember(Ref<Api.User.User> member)
  {
    var driverLianes = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Driver.User == member.Id && l.State == LianeState.NotStarted)
      .ToListAsync();
    await chatService.Clear(driverLianes.FilterSelect(l => l.Conversation?.Id));
    await postgisService.Clear(driverLianes.Select(l => l.Id));

    var toUpdate = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.Members.Any(m => m.User == member.Id) && l.State == LianeState.NotStarted)
      .ToListAsync();

    foreach (var liane in toUpdate)
    {
      await RemoveMember(liane.Id, member);
    }
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

    var updated = await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync<LianeDb>(l => l.Id == liane.Id, update, new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After });

    var updatedLiane = await MapEntity(updated);
    await postgisService.UpdateGeometry(updatedLiane);
    await PushUpdate(updated);
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
     updated = await Mongo.GetCollection<LianeDb>()
        .FindOneAndUpdateAsync<LianeDb>(
          l => l.Id == liane,
          Builders<LianeDb>.Update.Set(l => l.State, updated.Members.All(m => m.Feedback!.Canceled) ? LianeState.Canceled : LianeState.Archived),
          new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After }
        );
    }

    await PushUpdate(updated);

  }

  private async Task PushUpdate(LianeDb liane)
  {
    foreach (var lianeMember in liane.Members)
    {
      var resolved = await GetForCurrentUser(liane.Id, lianeMember.User);
      await lianeUpdateObserver.Push(resolved, lianeMember.User);
    }
  }

  public async Task<string> GetContact(Ref<Api.Trip.Liane> id, Ref<Api.User.User> requester, Ref<Api.User.User> member)
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

  private async Task<ImmutableList<WayPoint>> GetWayPoints(DateTime departureTime, Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
  {
    var (driverSegment, segments) = await ExtractRouteSegments(driver, lianeMembers);
    var result = await routingService.GetTrip(departureTime, driverSegment, segments);
    if (result == null)
    {
      throw new ValidationException("members", ValidationMessage.HasWrongFormat);
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
    var recurrence = liane.Recurrence is null ? null : await lianeRecurrenceService.Get(liane.Recurrence);
    return new Api.Trip.Liane(liane.Id, liane.CreatedBy!, liane.CreatedAt, liane.DepartureTime, liane.Return, wayPoints, users, liane.Driver, liane.State, liane.Conversation, recurrence.GetOrDefault(r => new Recurrence(r.Id!, r.Days)));
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

  public async Task<Api.Trip.Liane> UpdateDepartureTime(Ref<Api.Trip.Liane> liane, DateTime departureTime)
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

  public async Task UpdateState(Ref<Api.Trip.Liane> liane, LianeState state)
  {
    var lianeDb = await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync<LianeDb>(l => l.Id == liane.Id, Builders<LianeDb>.Update.Set(l => l.State, state), new FindOneAndUpdateOptions<LianeDb>{ReturnDocument = ReturnDocument.After});

    if (lianeDb.State == LianeState.Finished || lianeDb.State == LianeState.Canceled)
    {
      await postgisService.Clear(new []
      {
        liane.Id
      });
    }
    await PushUpdate(lianeDb);
  }

  public async Task RemoveRecurrence(Ref<LianeRecurrence> recurrence)
  {
    // Directly delete liane without other members
    Expression<Func<LianeDb, bool>> filter = l => l.Recurrence == recurrence.Id && l.Members.Count <= 1;
    var toDelete = await Mongo.GetCollection<LianeDb>()
      .Find(filter)
      .Select(l => l.Id);
    await postgisService.Clear(toDelete);
    await Mongo.GetCollection<LianeDb>().DeleteManyAsync(filter);

    // Remove recurrence ref for others
    await Mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync(l => l.Recurrence == recurrence.Id,
        Builders<LianeDb>.Update.Unset(l => l.Recurrence));
  }

  public async Task<FeatureCollection> GetGeolocationPings(Ref<Api.Trip.Liane> liane)
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

  public async Task ForceSyncDatabase()
  {
    var results = await Mongo.GetCollection<LianeDb>()
      .Find(l => l.State == LianeState.NotStarted)
      .SelectAsync(MapEntity);
    await postgisService.SyncGeometries(results);
  }
}