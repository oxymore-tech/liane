using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Community;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Geo;
using Liane.Service.Internal.Util.Sql;
using NetTopologySuite.Geometries;
using UuidExtensions;
using LianeMatch = Liane.Api.Community.LianeMatch;
using LianeRequest = Liane.Api.Community.LianeRequest;
using LianeState = Liane.Api.Community.LianeState;
using Match = Liane.Api.Community.Match;

namespace Liane.Service.Internal.Community;

using IncomingTrips = ImmutableDictionary<DayOfWeek, ImmutableList<IncomingTrip>>;

public sealed class LianeServiceImpl(
  PostgisDatabase db,
  ICurrentContext currentContext,
  IRoutingService routingService,
  IRallyingPointService rallyingPointService,
  LianeFetcher lianeFetcher,
  LianeRequestFetcher lianeRequestFetcher,
  LianeMatcher matcher,
  LianeMessageServiceImpl lianeMessageService,
  ITripService tripService,
  EventDispatcher eventDispatcher) : ILianeService
{
  public async Task<IncomingTrips> GetIncomingTrips()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var links = (await connection.QueryAsync<(Guid, Guid)>("""
                                                           SELECT liane_request_id, liane_id
                                                           FROM liane_request lr, liane_member lm
                                                           WHERE lr.created_by = @userId AND
                                                                 lr.id = lm.liane_request_id AND
                                                                 lm.joined_at IS NOT NULL
                                                           """, new { userId })).ToImmutableList();

    var trips = await tripService.GetIncomingTrips(links.Select(l => l.Item2.AsRef<Api.Community.Liane>()));
    var lianes = await lianeFetcher.List(links.Select(l => l.Item2));
    var lianeRequests = await lianeRequestFetcher.List(links.Select(l => l.Item1));
    return trips.FilterSelect(t =>
      {
        var liane = lianes.GetValueOrDefault(t.Liane.IdAsGuid());

        var me = liane?.Members.FirstOrDefault(m => m.User.Id == userId);
        if (me is null)
        {
          return null;
        }

        var lianeRequest = lianeRequests.GetValueOrDefault(me.LianeRequest.IdAsGuid());
        return lianeRequest is null
          ? null
          : new IncomingTrip(me.LianeRequest, lianeRequest.Name, t.Members.Exists(m => m.User.Id == userId), t);
      })
      .GroupBy(i => i.Trip.DepartureTime.DayOfWeek)
      .ToImmutableDictionary(g => g.Key, g => g
        .OrderByDescending(t => t.Booked)
        .ThenBy(t => t.Trip.DepartureTime)
        .ToImmutableList()
      );
  }

  public async Task<LianeRequest> Create(LianeRequest request)
  {
    CheckWayPoints(request);

    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var id = request.Id ?? Uuid7.Guid();

    var wayPointsArray = await MergeRoute(request.WayPoints, connection, tx);

    var now = DateTime.UtcNow;
    var lianeRequestDb = new LianeRequestDb(id, request.Name, wayPointsArray, request.RoundTrip, request.ArriveBefore, request.ReturnAfter, request.CanDrive, request.WeekDays, request.IsEnabled,
      userId, now);

    await connection.InsertAsync(lianeRequestDb, tx);

    var created = await lianeRequestFetcher.FetchLianeRequest(connection, id, tx);

    tx.Commit();

    return created;
  }

  public async Task<LianeMatch> Match(Guid lianeRequestId)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var r = await lianeRequestFetcher.FetchLianeRequest(connection, lianeRequestId);
    if (r.CreatedBy!.Id != userId)
    {
      throw new ResourceNotFoundException("LianeRequest not found");
    }

    var linkedTo = (await connection.QueryAsync(Query.Select<LianeMemberDb>()
        .Where(m => m.LianeRequestId, ComparisonOperator.Eq, lianeRequestId)
        .And(m => m.JoinedAt, ComparisonOperator.Ne, null)))
      .ToImmutableDictionary(m => m.LianeRequestId);

    var lianeFilter = linkedTo.Values.Select(s => s.LianeId).ToImmutableList();

    var matches = await matcher.FindLianeMatch(connection, lianeRequestId);
    var linkedToLianes = await lianeFetcher.FetchLianes(connection, lianeFilter);

    if (linkedTo.TryGetValue(r.Id!.Value, out var member))
    {
      var liane = linkedToLianes.GetValueOrDefault(member.LianeId);
      if (liane is not null)
      {
        return new LianeMatch(r, new LianeState.Attached(liane));
      }
    }

    return new LianeMatch(r, new LianeState.Detached(matches));
  }

  public async Task<ImmutableList<LianeMatch>> Match()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequests = await lianeRequestFetcher.FetchLianeRequests(connection, Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId));

    var linkedTo = (await connection.QueryAsync(Query.Select<LianeMemberDb>()
        .Where(m => m.LianeRequestId, ComparisonOperator.In, lianeRequests.Select(r => r.Id!.Value))
        .And(m => m.JoinedAt, ComparisonOperator.Ne, null)))
      .ToImmutableDictionary(m => m.LianeRequestId);

    var lianeFilter = linkedTo.Values.Select(s => s.LianeId).ToImmutableList();

    var matches = await matcher.FindMatches(connection, lianeFilter);
    var linkedToLianes = await lianeFetcher.FetchLianes(connection, lianeFilter);

    return lianeRequests.Select(r =>
      {
        if (linkedTo.TryGetValue(r.Id!.Value, out var member))
        {
          var liane = linkedToLianes.GetValueOrDefault(member.LianeId);
          if (liane is not null)
          {
            return new LianeMatch(r, new LianeState.Attached(liane));
          }
        }

        var result = matches.GetValueOrDefault(r.Id!.Value, ImmutableList<Match>.Empty);
        return new LianeMatch(r, new LianeState.Detached(result));
      })
      .OrderByDescending(m => m.State is LianeState.Attached)
      .ToImmutableList();
  }

  public async Task<ImmutableList<Api.Community.Liane>> List(LianeFilter filter)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequestFilter = Filter<LianeRequestDb>.Empty;

    if (filter.ForCurrentUser)
    {
      lianeRequestFilter &= Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId);
    }

    if (filter.Bbox is not null)
    {
      var ids = await connection.QueryAsync<Guid>("""
                                                  SELECT DISTINCT COALESCE(lm.liane_id, lr.id) AS id
                                                  FROM liane_request lr
                                                  INNER JOIN  route r ON lr.way_points = r.way_points
                                                  LEFT JOIN liane_member lm ON lr.id = lm.liane_request_id AND lm.joined_at is not null
                                                  WHERE ST_Intersects(@bbox, r.geometry)
                                                  """, new { bbox = filter.Bbox.AsPolygon() });
      lianeRequestFilter &= Filter<LianeRequestDb>.Where(r => r.Id, ComparisonOperator.In, ids);
    }

    IEnumerable<LianeRequest> lianeRequests = await lianeRequestFetcher.FetchLianeRequests(connection, lianeRequestFilter);

    if (filter.WeekDays is not null)
    {
      lianeRequests = lianeRequests.Where(r => r.WeekDays.HasFlag(filter.WeekDays.Value));
    }

    return (await lianeFetcher.FetchLianes(connection, lianeRequests.Select(l => l.Id!.Value).Take(20))).Values
      .Where(l => l.TotalMembers > 0 || l.CreatedBy.Id != userId)
      .OrderByDescending(l => l.TotalMembers)
      .ThenByDescending(l => l.WeekDays)
      .ThenByDescending(l => l.ReturnAfter - l.ArriveBefore)
      .ThenBy(l => l.Id)
      .ToImmutableList();
  }

  public async Task<LianeRequest> Update(Ref<LianeRequest> id, LianeRequest request)
  {
    CheckWayPoints(request);
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    var tx = connection.BeginTransaction();

    var lianeRequestId = Guid.Parse(id);

    var wayPointsArray = await MergeRoute(request.WayPoints, connection, tx);

    var updated = await connection.UpdateAsync(Query.Update<LianeRequestDb>()
      .Set(r => r.Name, request.Name)
      .Set(r => r.IsEnabled, request.IsEnabled)
      .Set(r => r.RoundTrip, request.RoundTrip)
      .Set(r => r.ArriveBefore, request.ArriveBefore)
      .Set(r => r.ReturnAfter, request.ReturnAfter)
      .Set(r => r.WeekDays, request.WeekDays)
      .Set(r => r.CanDrive, request.CanDrive)
      .Set(r => r.WayPoints, wayPointsArray)
      .Where(r => r.Id, ComparisonOperator.Eq, lianeRequestId)
      .And(r => r.CreatedBy, ComparisonOperator.Eq, userId), tx);

    if (updated == 0)
    {
      throw new UnauthorizedAccessException("User is not the owner of the liane request");
    }

    var lianeRequestDb = await connection.GetAsync<LianeRequestDb>(lianeRequestId, tx);

    tx.Commit();

    return new LianeRequest(
      lianeRequestDb.Id,
      lianeRequestDb.Name,
      await lianeRequestDb.WayPoints.AsRef<RallyingPoint>(rallyingPointService.Get),
      lianeRequestDb.RoundTrip,
      lianeRequestDb.ArriveBefore,
      lianeRequestDb.ReturnAfter,
      lianeRequestDb.CanDrive,
      lianeRequestDb.WeekDays,
      lianeRequestDb.IsEnabled,
      lianeRequestDb.CreatedBy,
      lianeRequestDb.CreatedAt
    );
  }

  public async Task Delete(Ref<LianeRequest> id)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var lianeRequestId = Guid.Parse(id);

    var lianeRequest = await connection.FirstOrDefaultAsync(
      Query.Select<LianeRequestDb>()
        .Where(r => r.Id, ComparisonOperator.Eq, lianeRequestId)
        .And(r => r.CreatedBy, ComparisonOperator.Eq, userId)
      , tx);

    if (lianeRequest is null)
    {
      return;
    }

    await connection.DeleteAsync(Filter<LianeMemberDb>.Where(m => m.LianeRequestId, ComparisonOperator.Eq, lianeRequestId), tx);

    await connection.DeleteAsync(
      Filter<LianeRequestDb>.Where(r => r.Id, ComparisonOperator.Eq, lianeRequestId)
      & Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId)
      , tx);

    tx.Commit();
  }

  public async Task<Api.Community.Liane?> JoinRequest(Ref<Api.Community.Liane> a, Ref<Api.Community.Liane> b)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;

    var idA = a.IdAsGuid();
    var idB = b.IdAsGuid();

    if (idA == idB)
    {
      return null;
    }

    var lianeA = await lianeFetcher.FetchLiane(connection, idA, tx);
    var lianeB = await lianeFetcher.FetchLiane(connection, idB, tx);

    if (!lianeA.IsMember(userId) && !lianeB.IsMember(userId))
    {
      return null;
    }

    var memberA = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, idA), tx);
    var memberB = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, idB), tx);

    Guid? joinedLianeA = memberA?.JoinedAt is not null ? memberA.LianeId : null;
    Guid? joinedLianeB = memberB?.JoinedAt is not null ? memberB.LianeId : null;

    if (joinedLianeA is not null && joinedLianeB is not null)
    {
      return null;
    }

    if (joinedLianeA is not null)
    {
      var liane = await lianeFetcher.FetchLiane(connection, joinedLianeA.Value, tx);
      if (liane.IsMember(userId, false))
      {
        return await AddMemberInLiane(connection, lianeB, liane.Id, userId, false, tx);
      }

      await InsertJoinRequest(connection, lianeB.Id, liane.Id, tx, userId);
      return null;
    }

    if (joinedLianeB is not null)
    {
      var liane = await lianeFetcher.FetchLiane(connection, joinedLianeB.Value, tx);
      if (liane.IsMember(userId, false))
      {
        return await AddMemberInLiane(connection, lianeA, liane.Id, userId, false, tx);
      }

      await InsertJoinRequest(connection, lianeA.Id, liane.Id, tx, userId);
      return null;
    }

    if (memberA is null && memberB?.LianeId == lianeA.Id)
    {
      if (lianeA.CreatedBy.Id != userId)
      {
        return null;
      }

      return await AddMemberInLiane(connection, lianeB, lianeA.Id, userId, true, tx);
    }

    if (memberB is null && memberA?.LianeId == lianeB.Id)
    {
      if (lianeB.CreatedBy.Id != userId)
      {
        return null;
      }

      return await AddMemberInLiane(connection, lianeA, lianeB.Id, userId, true, tx);
    }

    {
      var (mine, foreign) = lianeA.CreatedBy.Id == userId ? (lianeA.Id, lianeB.Id) : (lianeB.Id, lianeA.Id);
      await InsertJoinRequest(connection, mine, foreign, tx, userId);
      return null;
    }
  }

  public async Task<bool> Reject(Ref<Api.Community.Liane> a, Ref<Api.Community.Liane> b)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var lrA = await connection.GetAsync<LianeRequestDb>(a.IdAsGuid(), tx);
    var lrB = await connection.GetAsync<LianeRequestDb>(b.IdAsGuid(), tx);

    var memberA = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, a.IdAsGuid()), tx);
    var memberB = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, b.IdAsGuid()), tx);

    if (memberA is null && memberB is null)
    {
      return false;
    }

    Guid? joinedLianeA = memberA?.JoinedAt is not null ? memberA.LianeId : null;
    Guid? joinedLianeB = memberB?.JoinedAt is not null ? memberB.LianeId : null;

    if (joinedLianeA is not null && joinedLianeB is not null)
    {
      return false;
    }

    if (joinedLianeA is not null)
    {
      return await Reject(connection, lrB, joinedLianeA.Value, tx);
    }

    if (joinedLianeB is not null)
    {
      return await Reject(connection, lrA, joinedLianeB.Value, tx);
    }

    if (memberA is null && memberB?.LianeId == lrA.Id)
    {
      return await Reject(connection, lrB, lrA.Id, tx);
    }

    if (memberB is null && memberA?.LianeId == lrB.Id)
    {
      return await Reject(connection, lrA, lrB.Id, tx);
    }

    return await Reject(connection, lrB, lrA.Id, tx) || await Reject(connection, lrA, lrB.Id, tx);
  }

  public async Task<Api.Community.Liane> Get(Ref<Api.Community.Liane> id)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;

    var idAsGuid = id.IdAsGuid();
    var liane = await lianeFetcher.FetchLiane(connection, idAsGuid, tx);
    if (liane.IsMember(userId))
    {
      return liane;
    }

    // check if the owner of the liane is a trying to join a liane (members of this foreign liane are autorized to get the user's liane) 
    var member = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, idAsGuid), tx);
    if (member?.LianeId is null)
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    var foreginLiane = await lianeFetcher.FetchLiane(connection, member.LianeId, tx);
    if (!foreginLiane.IsMember(userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    return liane;
  }

  public async Task<ImmutableList<WayPoint>> GetTrip(Guid liane, Guid? lianeRequest)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var (rallyingPoints, arriveBefore, at) = await GetBestTrip(connection, liane, lianeRequest, tx);

    var wayPoints = await routingService.GetOptimizedTrip(rallyingPoints);

    var computedTime = TimeOnly.FromDateTime(wayPoints.First(w => w.RallyingPoint.Id == at.Id).Eta);
    var diff = computedTime - arriveBefore;

    return wayPoints.Select(w => w with { Eta = w.Eta - diff }).ToImmutableList();
  }

  public async Task<PendingMatch?> Matches(Guid liane, Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    using var connection = db.NewConnection();

    var (_, route) = await GetRoute(ImmutableList.Create(from, to));

    var rawMatch = (await connection.QueryAsync<PendingRawMatch>("""
                                                                 SELECT
                                                                     ((match).score) AS score,
                                                                     ((match).pickup) AS pickup,
                                                                     ((match).deposit) AS deposit,
                                                                     ((match).is_reverse_direction) AS is_reverse_direction
                                                                 FROM (
                                                                          SELECT
                                                                              match_routes(@route, b.geometry) AS match
                                                                          FROM liane_request lr
                                                                           INNER JOIN route b on b.way_points = lr.way_points
                                                                          WHERE lr.id = @liane
                                                                      ) AS ii
                                                                 WHERE (match).score > @threshold AND (match).is_reverse_direction = false 
                                                                 LIMIT 1
                                                                 """,
      new { threshold = LianeMatcher.MinScore, route, liane }
    )).FirstOrDefault();

    if (rawMatch?.Deposit is null || rawMatch.Pickup is null)
    {
      return null;
    }

    var snapedPoints = await rallyingPointService.Snap(ImmutableHashSet.Create(rawMatch.Pickup.Value, rawMatch.Deposit.Value));
    var pickup = snapedPoints.GetValueOrDefault(rawMatch.Pickup.Value);
    var deposit = snapedPoints.GetValueOrDefault(rawMatch.Deposit.Value);
    return new PendingMatch(pickup, deposit, rawMatch.IsReverseDirection);
  }

  public async Task<bool> JoinTrip(JoinTripQuery query)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;

    var trip = await tripService.Get(query.Trip);
    var liane = await lianeFetcher.FetchLiane(connection, trip.Liane.IdAsGuid(), tx);

    var member = liane.Members.FirstOrDefault(m => m.User.Id == userId);
    var driver = liane.Members.FirstOrDefault(m => m.User.Id == trip.Driver.User.Id);

    if (member is null)
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    if (driver is null)
    {
      throw new UnauthorizedAccessException("Driver is not part of the liane");
    }

    var match = await matcher.FindMatchBetween(connection, member.LianeRequest.IdAsGuid(), driver.LianeRequest.IdAsGuid(), tx);
    if (match is null)
    {
      return false;
    }

    var direction = CheckDirection(ImmutableList.Create<Ref<RallyingPoint>>(match.Pickup, match.Deposit), trip.WayPoints);
    var (pickup, deposit) = direction == Direction.Outbound
      ? (match.Pickup, match.Deposit)
      : (match.Deposit, match.Pickup);

    await tripService.AddMember(trip, new TripMember(userId, pickup, deposit));
    return true;
  }

  private async Task<bool> Reject(IDbConnection connection, LianeRequestDb lianeRequest, Guid lianeId, IDbTransaction tx)
  {
    var userId = currentContext.CurrentUser().Id;
    
    var deleted = await connection.DeleteAsync(Filter<LianeMemberDb>
      .Where(m => m.LianeRequestId, ComparisonOperator.Eq, lianeRequest.Id)
      .And(m => m.LianeId, ComparisonOperator.Eq, lianeId)
      .And(m => m.JoinedAt, ComparisonOperator.Eq, null), tx);

    if (deleted == 0)
    {
      return false;
    }

    var resolvedLianeRequest = await connection.GetAsync<LianeRequestDb>(lianeRequest.Id, tx);

    if (resolvedLianeRequest.CreatedBy != userId)
    {
      await eventDispatcher.Dispatch(lianeId, new MessageContent.MemberRejected("", resolvedLianeRequest.CreatedBy));
    }

    tx.Commit();

    return true;
  }

  private async Task<Api.Community.Liane> AddMemberInLiane(IDbConnection connection, Api.Community.Liane request, Guid liane, Ref<Api.Auth.User> userId, bool newLiane, IDbTransaction tx)
  {
    await connection.UpdateAsync(Query.Update<LianeMemberDb>()
      .Set(m => m.LianeId, liane)
      .Where(m => m.LianeId, ComparisonOperator.Eq, request.Id), tx);
    var at = DateTime.UtcNow;
    var updated = await connection.UpdateAsync(Query.Update<LianeMemberDb>()
      .Set(m => m.JoinedAt, at)
      .Where(m => m.LianeRequestId, ComparisonOperator.Eq, request.Id)
      .And(m => m.JoinedAt, ComparisonOperator.Eq, null)
      .And(m => m.LianeId, ComparisonOperator.Eq, liane), tx);
    if (newLiane)
    {
      await connection.InsertAsync(new LianeMemberDb(liane, liane, request.CreatedAt, request.CreatedAt, null), tx);
      await eventDispatcher.Dispatch(liane, new MessageContent.MemberAdded("", userId, liane), request.CreatedAt);
    }

    if (updated > 0)
    {
      await eventDispatcher.Dispatch(liane, new MessageContent.MemberAdded("", request.CreatedBy, request.Id), at);
    }

    var created = await lianeFetcher.FetchLiane(connection, liane, tx);
    tx.Commit();
    return created;
  }

  private async Task InsertJoinRequest(IDbConnection connection, Guid request, Guid liane, IDbTransaction tx, string userId)
  {
    var at = DateTime.UtcNow;
    // supprime toute autres demandes vers cette liane pour le même utilisateur
    var existing = await connection.QuerySingleAsync<int>("""
                                                          SELECT count(*) FROM liane_member lm
                                                          WHERE lm.liane_id = @liane_id AND lm.liane_request_id = @liane_request_id
                                                          """, new { liane_id = liane, liane_request_id = request }, tx);
    if (existing > 0)
    {
      return;
    }

    await connection.ExecuteAsync("""
                                  DELETE FROM liane_member lm
                                  WHERE lm.liane_id = @liane_id
                                      AND joined_at IS NULL
                                      AND lm.liane_request_id IN (
                                          SELECT lr.id
                                          FROM liane_request lr
                                          WHERE lr.created_by = @userId
                                      )
                                  """, new { liane_id = liane, liane_request_id = request, userId }, tx);
    var updated = await connection.InsertAsync(new LianeMemberDb(request, liane, at, null, null), tx);
    tx.Commit();
    if (updated > 0)
    {
      await eventDispatcher.Dispatch(liane, new MessageContent.MemberRequested("", userId, request), at);
    }
  }

  private static Direction CheckDirection(ImmutableList<Ref<RallyingPoint>> lianeRequestWayPoints, ImmutableList<WayPoint> tripWayPoints)
  {
    int? lastIndex = null;
    foreach (var wayPoint in tripWayPoints)
    {
      var indexOf = lianeRequestWayPoints.IndexOf(wayPoint.RallyingPoint);
      if (indexOf == -1)
      {
        continue;
      }

      if (lastIndex is null)
      {
        lastIndex = indexOf;
        continue;
      }

      if (indexOf < lastIndex)
      {
        return Direction.Inbound;
      }
    }

    return Direction.Outbound;
  }

  public async Task<bool> Leave(Ref<Api.Community.Liane> liane)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var lianeId = Guid.Parse(liane.Id);
    var lianeMemberDb = await lianeMessageService.TryGetMember(connection, lianeId, userId, tx);
    if (lianeMemberDb is null)
    {
      return false;
    }

    await connection.ExecuteAsync("DELETE FROM liane_member WHERE liane_id = @liane_id AND liane_request_id = @liane_request_id",
      new { liane_id = lianeMemberDb.LianeId, liane_request_id = lianeMemberDb.LianeRequestId }, tx);
    tx.Commit();

    await eventDispatcher.Dispatch(liane, new MessageContent.MemberLeft("", userId));

    return true;
  }

  private async Task<(ImmutableList<RallyingPoint> WayPoints, TimeOnly ArriveBefore, Ref<RallyingPoint> At)> GetBestTrip(IDbConnection connection, Guid liane, Guid? lianeRequest,
    IDbTransaction? tx = null)
  {
    var resolved = await lianeFetcher.FetchLiane(connection, liane, tx);
    if (lianeRequest is null)
    {
      return (resolved.WayPoints, resolved.ArriveBefore, resolved.WayPoints.Last());
    }

    var bestMatch = await matcher.FindMatchBetween(connection, liane, lianeRequest.Value, tx);

    if (bestMatch is null)
    {
      return (resolved.WayPoints, resolved.ArriveBefore, resolved.WayPoints.Last());
    }

    return (
      resolved.WayPoints.Insert(1, bestMatch.Pickup).Insert(2, bestMatch.Deposit).DistinctBy(w => w.Id).ToImmutableList(),
      resolved.ArriveBefore,
      resolved.WayPoints.Last()
    );
  }

  private async Task<string[]> MergeRoute(ImmutableList<Ref<RallyingPoint>> wayPoints, IDbConnection connection, IDbTransaction tx)
  {
    var (wayPointsArray, lineString) = await GetRoute(wayPoints);
    await connection.MergeAsync(new RouteDb(wayPointsArray, lineString), tx);
    return wayPointsArray;
  }

  private async Task<(string[] wayPointsArray, LineString lineString)> GetRoute(ImmutableList<Ref<RallyingPoint>> wayPoints)
  {
    var wayPointsArray = wayPoints.Deref();
    var coordinates = (await wayPoints.SelectAsync(rallyingPointService.Get))
      .Select(w => w.Location)
      .ToImmutableList();
    var route = await routingService.GetRoute(coordinates);
    var lineString = route.Coordinates.ToLineString();
    return (wayPointsArray, lineString);
  }

  private static void CheckWayPoints(LianeRequest request)
  {
    var wayPoints = request.WayPoints.Distinct().ToImmutableList();
    if (wayPoints.Count <= 1)
    {
      throw new ArgumentException("At least 2 waypoints are required");
    }

    if (request.WeekDays.IsEmpty())
    {
      throw new ArgumentException("At least 1 weekday is required");
    }
  }
}

public sealed record LianeMemberDb(
  Guid LianeRequestId,
  Guid LianeId,
  DateTime RequestedAt,
  DateTime? JoinedAt,
  DateTime? LastReadAt
);

public sealed record LianeRequestDb(
  Guid Id,
  string Name,
  string[] WayPoints,
  bool RoundTrip,
  TimeOnly ArriveBefore,
  TimeOnly ReturnAfter,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  bool IsEnabled,
  Ref<Api.Auth.User> CreatedBy,
  DateTime? CreatedAt
) : IEntity<Guid>;

public sealed record RouteDb(
  string[] WayPoints,
  LineString Geometry
);

public sealed record LianeMessageDb(
  Guid Id,
  Guid LianeId,
  MessageContent Content,
  Ref<Api.Auth.User> CreatedBy,
  DateTime? CreatedAt
) : IEntity<Guid>;

enum Direction
{
  Outbound,
  Inbound
};

public sealed record PendingRawMatch(
  float Score,
  LatLng? Pickup,
  LatLng? Deposit,
  bool IsReverseDirection
);