using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Auth;
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
using Notification = Liane.Api.Event.Notification;

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
  IUserService userService,
  IPushService pushService,
  IHubService hubService,
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

    var (linkedTo, lianeFilter) = await GetLinkedTo(connection, [r.Id!.Value]);

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

  async Task<ImmutableList<LianeMatch>> ILianeService.Match()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequests = await lianeRequestFetcher.FetchLianeRequests(connection, Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId));

    var (linkedTo, lianeFilter) = await GetLinkedTo(connection, lianeRequests.Select(l => l.Id!.Value));

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

  private static async Task<(ImmutableDictionary<Guid, LianeMemberDb> linkedTo, ImmutableList<Guid> lianeFilter)> GetLinkedTo(IDbConnection connection, IEnumerable<Guid> lianeRequests)
  {
    var linkedTo = (await connection.QueryAsync(Query.Select<LianeMemberDb>()
        .Where(l => l.LianeRequestId, ComparisonOperator.In, lianeRequests)
        .And(l => l.JoinedAt, ComparisonOperator.Ne, null)
      ))
      .ToImmutableDictionary(m => m.LianeRequestId);

    var lianeFilter = linkedTo.Values.Select(s => s.LianeId).ToImmutableList();
    return (linkedTo, lianeFilter);
  }

  public async Task<ImmutableList<Api.Community.Liane>> List(LianeFilter filter)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequestsIds = await connection.QueryAsync<Guid>("""
                                                             SELECT DISTINCT lr.id
                                                             FROM liane_request lr
                                                             INNER JOIN route r ON lr.way_points = r.way_points
                                                             WHERE lr.created_by != @userId AND ST_Intersects(@bbox, r.geometry)
                                                             """, new { userId, bbox = filter.Bbox.AsPolygon() });
    var lianeRequestFilter = Filter<LianeRequestDb>.Where(r => r.Id, ComparisonOperator.In, lianeRequestsIds);

    IEnumerable<LianeRequest> lianeRequests = await lianeRequestFetcher.FetchLianeRequests(connection, lianeRequestFilter);

    if (filter.WeekDays is not null)
    {
      lianeRequests = lianeRequests.Where(r => r.WeekDays.HasFlag(filter.WeekDays.Value));
    }

    var lianeIds = await connection.QueryAsync<Guid>("""
                                                     SELECT DISTINCT lm.liane_id
                                                     FROM liane_member lm
                                                     WHERE lm.liane_request_id = ANY(@lianeRequestsIds) AND lm.joined_at is not null
                                                     """, new { lianeRequestsIds });

    var lianes = (await lianeFetcher.FetchLianes(connection, lianeIds)).Values
      .Take(10)
      .OrderByDescending(l => l.TotalMembers)
      .ThenByDescending(l => l.WeekDays)
      .ThenByDescending(l => l.ReturnAfter - l.ArriveBefore)
      .ThenByDescending(l => l.Id)
      .ToImmutableList();

    var linkedRequests = lianes.SelectMany(l => l.Members.Select(m => m.LianeRequest.IdAsGuid())).ToImmutableHashSet();

    var orphanRequests = (await lianeRequests
        .Where(r => !linkedRequests.Contains(r.Id!.Value))
        .SelectAsync(ToFakeLiane))
      .Take(10)
      .ToImmutableList();

    return lianes.Concat(orphanRequests)
      .Take(10)
      .ToImmutableList();
  }

  private async Task<Api.Community.Liane> ToFakeLiane(LianeRequest r)
  {
    var user = await userService.Get(r.CreatedBy!);

    return new Api.Community.Liane(
      r.Id!.Value,
      ImmutableList.Create(new LianeMember(user, r, r.CreatedAt!.Value, null)),
      ImmutableList<LianeMember>.Empty,
      await r.WayPoints.SelectAsync(rallyingPointService.Get),
      r.RoundTrip,
      r.ArriveBefore,
      r.ReturnAfter,
      r.ArriveBefore,
      r.ReturnAfter,
      r.WeekDays,
      true
    );
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

  public async Task<Api.Community.Liane?> JoinRequest(Ref<LianeRequest> a, Ref<Api.Community.Liane> b)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;

    var resolvedA = await TryFetchLianeOrRequest(connection, a.IdAsGuid(), userId, false, tx);
    var resolvedB = await TryFetchLianeOrRequest(connection, b.IdAsGuid(), userId, false, tx);

    if (resolvedA is null || resolvedB is null)
    {
      return null;
    }

    if ((resolvedA.IsCurrentUser && resolvedB.IsCurrentUser) || (!resolvedA.IsCurrentUser && !resolvedB.IsCurrentUser))
    {
      return null;
    }

    var result = (resolvedA.IsCurrentUser ? (resolvedA, resolvedB) : (resolvedB, resolvedA)) switch
    {
      (LianeOrRequest.Request requester, LianeOrRequest.Request requestee) =>
        await AddJoinRequest(connection, requester.Value, requestee.Value, tx),

      (LianeOrRequest.Liane requestee, LianeOrRequest.Request requester) =>
        await AddLianeMember(connection, requester.Value, requestee.Value.Id, tx),

      (LianeOrRequest.Request requester, LianeOrRequest.Liane requestee) =>
        await AddLianeMemberRequest(connection, requester.Value, requestee.Value.Id, tx),

      _ => null
    };

    var liane = result is null ? null : await lianeFetcher.FetchLiane(connection, result.Liane, tx);
    tx.Commit();

    if (result is null)
    {
      return null;
    }

    foreach (var message in result.Messages)
    {
      await eventDispatcher.Dispatch(liane!, message, result.At);
    }

    return result.IsJoined ? liane : null;
  }

  public async Task<bool> Reject(Ref<LianeRequest> a, Ref<Api.Community.Liane> b)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;

    var resolvedA = await TryFetchLianeOrRequest(connection, a.IdAsGuid(), userId, true, tx);
    var resolvedB = await TryFetchLianeOrRequest(connection, b.IdAsGuid(), userId, true, tx);

    if (resolvedA is null || resolvedB is null)
    {
      return false;
    }

    if (!resolvedA.IsCurrentUser && !resolvedB.IsCurrentUser)
    {
      return false;
    }

    var result = (resolvedA.IsCurrentUser ? (resolvedA, resolvedB) : (resolvedB, resolvedA)) switch
    {
      (LianeOrRequest.Request requester, LianeOrRequest.Request requestee) =>
        await RejectJoinRequest(connection, requester.Value, requestee.Value, tx),

      (LianeOrRequest.Liane requestee, LianeOrRequest.Request requester) =>
        await RejectLianeMember(connection, requester.Value, requestee.Value, tx),

      (LianeOrRequest.Request requester, LianeOrRequest.Liane requestee) =>
        await RejectLianeMember(connection, requester.Value, requestee.Value, tx),

      _ => false
    };

    if (result)
    {
      tx.Commit();
    }

    return result;
  }

  public async Task<Api.Community.Liane> Get(Ref<Api.Community.Liane> id)
  {
    using var connection = db.NewConnection();
    var userId = currentContext.CurrentUser().Id;

    var liane = await lianeFetcher.FetchLiane(connection, id.IdAsGuid());
    if (liane.IsMember(userId))
    {
      return liane;
    }

    throw new UnauthorizedAccessException("User is not part of the liane");
  }

  public async Task<ImmutableList<WayPoint>> GetTrip(Guid liane, Guid? lianeRequest)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var bestTrip = await GetBestTrip(connection, liane, lianeRequest, tx);

    var wayPoints = await routingService.GetOptimizedTrip(bestTrip.WayPoints, bestTrip.Sources, bestTrip.Destinations);

    var computedTime = TimeOnly.FromDateTime(wayPoints.First(w => w.RallyingPoint.Id == bestTrip.At.Id).Eta);
    var diff = computedTime - bestTrip.ArriveBefore;

    return wayPoints.Select(w => w with { Eta = w.Eta - diff }).ToImmutableList();
  }

  public async Task<PendingMatch?> Matches(Guid liane, Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    using var connection = db.NewConnection();

    var (_, route) = await GetRoute(ImmutableList.Create(from, to));

    var pendingRawMatches = await connection.QueryAsync<PendingRawMatch>("""
                                                                         SELECT
                                                                            ii.id as liane_request_id,
                                                                             ((match).score) AS score,
                                                                             ((match).pickup) AS pickup,
                                                                             ((match).deposit) AS deposit,
                                                                             ((match).is_reverse_direction) AS is_reverse_direction
                                                                         FROM (
                                                                                  SELECT
                                                                                    lr.id,
                                                                                      match_routes(@route, b.geometry) AS match
                                                                                  FROM liane_request lr
                                                                                    INNER JOIN route b on b.way_points = lr.way_points
                                                                                    LEFT JOIN liane_member lm on lm.liane_request_id = lr.id
                                                                                  WHERE (lr.id = @liane OR lm.liane_id = @liane)
                                                                              ) AS ii
                                                                         WHERE (match).score > @threshold AND (match).is_reverse_direction = false 
                                                                         ORDER BY (match).score desc
                                                                         """,
      new { threshold = LianeMatcher.MinScore, route, liane }
    );
    var rawMatch = pendingRawMatches.FirstOrDefault(r => r.Deposit is not null && r.Pickup is not null);

    if (rawMatch is null)
    {
      return null;
    }

    var snapedPoints = await rallyingPointService.Snap(ImmutableHashSet.Create(rawMatch.Pickup!.Value, rawMatch.Deposit!.Value));
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

  private async Task<bool> RejectJoinRequest(IDbConnection connection, LianeRequest requesterValue, LianeRequest requesteeValue, IDbTransaction tx)
  {
    var deleted = await connection.DeleteAsync(Filter<JoinRequestDb>.Where(l => l.RequesterId, ComparisonOperator.Eq, requesterValue.Id)
      .And(l => l.RequesteeId, ComparisonOperator.Eq, requesteeValue.Id), tx);
    var deletedOpposite = await connection.DeleteAsync(Filter<JoinRequestDb>.Where(l => l.RequesterId, ComparisonOperator.Eq, requesteeValue.Id)
      .And(l => l.RequesteeId, ComparisonOperator.Eq, requesterValue.Id), tx);

    if (deletedOpposite > 0)
    {
      var requesterUser = await userService.Get(requesterValue.CreatedBy!);
      var requesteeUser = await userService.Get(requesteeValue.CreatedBy!);
      _ = Task.Run(async () =>
      {
        var requesteeId = requesteeValue.Id!.Value;
        await pushService.Push(requesteeUser,
          new Notification(Uuid7.Guid(), requesterValue.CreatedBy, DateTime.UtcNow, $"{requesterUser.Pseudo} n'a pas accepté votre demande", $"{requesterUser.Pseudo} n'a pas accepté votre demande",
            $"liane://liane/{requesteeId}/match"));
        await hubService.PushLianeUpdateTo(requesteeId, requesteeUser);
      });
      return true;
    }

    return deleted > 0;
  }

  private async Task<bool> RejectLianeMember(IDbConnection connection, LianeRequest requesterValue, Api.Community.Liane requesteeValue, IDbTransaction tx)
  {
    var lianeMember = await connection.FirstOrDefaultAsync(
      Query.Select<LianeMemberDb>()
        .Where(l => l.LianeRequestId, ComparisonOperator.Eq, requesterValue.Id)
        .And(l => l.LianeId, ComparisonOperator.Eq, requesteeValue.Id)
      , tx);

    if (lianeMember is null)
    {
      return false;
    }

    var deleted = await connection.DeleteAsync(Filter<LianeMemberDb>.Where(l => l.LianeRequestId, ComparisonOperator.Eq, lianeMember.LianeRequestId)
      .And(l => l.LianeId, ComparisonOperator.Eq, lianeMember.LianeId), tx);

    if (deleted == 0)
    {
      return false;
    }

    await eventDispatcher.Dispatch(requesteeValue, new MessageContent.MemberRejected("", requesterValue.CreatedBy!));

    return true;
  }

  private async Task<JoinRequestResult?> AddLianeMember(IDbConnection connection, LianeRequest requester, Guid liane, IDbTransaction tx)
  {
    var at = DateTime.UtcNow;
    var (main, moved) = await AddLianeMember(connection, requester, liane, at, tx);
    return new JoinRequestResult(at, liane, true, ImmutableList.Create(main).Concat(moved));
  }

  private async Task<LianeOrRequest?> TryFetchLianeOrRequest(IDbConnection connection, Guid id, string userId, bool includePendingMember, IDbTransaction tx)
  {
    var lianeMember = await connection.FirstOrDefaultAsync(
      Query.Select<LianeMemberDb>()
        .Where(r => r.LianeRequestId, ComparisonOperator.Eq, id)
        .And(r => r.JoinedAt, ComparisonOperator.Ne, null)
      , tx);

    var liane = await lianeFetcher.TryFetchLiane(connection, lianeMember?.LianeId ?? id, tx);
    if (liane is not null)
    {
      return new LianeOrRequest.Liane(liane, liane.IsMember(userId, includePendingMember));
    }

    var request = await lianeRequestFetcher.TryFetchLianeRequest(connection, id, tx);
    return request is not null ? new LianeOrRequest.Request(request, request.CreatedBy?.Id == userId) : null;
  }

  private static async Task ClearPreviousRequests(IDbConnection connection, IDbTransaction tx, Guid? requesterId)
  {
    await connection.DeleteAsync(Filter<JoinRequestDb>.Where(lm => lm.RequesterId, ComparisonOperator.Eq, requesterId), tx);
    await connection.DeleteAsync(Filter<LianeMemberDb>.Where(lm => lm.LianeRequestId, ComparisonOperator.Eq, requesterId), tx);
  }

  private async Task<JoinRequestResult?> AddLianeMemberRequest(IDbConnection connection, LianeRequest requester, Guid lianeId, IDbTransaction tx)
  {
    var at = DateTime.UtcNow;
    var requesterId = requester.Id!.Value;
    // on supprime une demande précédente si jamais il y en a une
    await ClearPreviousRequests(connection, tx, requesterId);

    await connection.InsertAsync(new LianeMemberDb(requesterId, lianeId, at, null, null), tx);

    return new JoinRequestResult(at, lianeId, false, [new MessageContent.MemberRequested("", requester.CreatedBy!, requester)]);
  }

  private async Task<(MessageContent, IEnumerable<MessageContent>)> AddLianeMember(IDbConnection connection, LianeRequest requester, Guid liane, DateTime at, IDbTransaction tx)
  {
    var movedRequests = await ClearRequesterRequestAndMoveRequestees(connection, requester, liane, at, tx);

    var updated = await connection.UpdateAsync(Query.Update<LianeMemberDb>()
      .Where(l => l.LianeRequestId, ComparisonOperator.Eq, requester.Id)
      .Set(l => l.JoinedAt, at), tx);
    if (updated == 0)
    {
      await connection.InsertAsync(new LianeMemberDb(requester.Id!.Value, liane, at, at, null), tx);
    }

    return (
      new MessageContent.MemberAdded("", requester.CreatedBy!, requester.Id),
      movedRequests.Select(lr => new MessageContent.MemberRequested("", lr.CreatedBy!, lr.Id))
    );
  }

  private async Task<ImmutableList<LianeRequest>> ClearRequesterRequestAndMoveRequestees(IDbConnection connection, LianeRequest requester, Guid liane,
    DateTime at, IDbTransaction tx)
  {
    await connection.DeleteAsync(Filter<JoinRequestDb>.Where(r => r.RequesterId, ComparisonOperator.Eq, requester.Id), tx);

    // Toutes les demandes en cours sur la liane request sont retransférées vers la liane
    var requesters = await connection.QueryAsync<Guid>(Query.Select<JoinRequestDb>(j => j.RequesterId)
      .Where(r => r.RequesteeId, ComparisonOperator.Eq, requester.Id), tx);
    await connection.DeleteAsync(Filter<JoinRequestDb>.Where(r => r.RequesteeId, ComparisonOperator.Eq, requester.Id), tx);

    var movedRequests = await lianeRequestFetcher.FetchLianeRequests(connection, requesters, tx);
    var movedMembers = movedRequests
      .Select(lr => new LianeMemberDb(lr.Id!.Value, liane, at, null, null))
      .ToImmutableList();

    await connection.InsertMultipleAsync(movedMembers, tx);
    return movedRequests;
  }

  private async Task<JoinRequestResult?> AddJoinRequest(IDbConnection connection, LianeRequest requester, LianeRequest requestee, IDbTransaction tx)
  {
    var requesterId = requester.Id!.Value;
    var requesteeId = requestee.Id!.Value;

    var existing = await connection.FirstOrDefaultAsync(Query.Select<JoinRequestDb>()
        .Where(r => r.RequesterId, ComparisonOperator.Eq, requesterId)
        .And(r => r.RequesteeId, ComparisonOperator.Eq, requesteeId)
      , tx);
    if (existing is not null)
    {
      return null;
    }

    var opposite = await connection.FirstOrDefaultAsync(Query.Select<JoinRequestDb>()
        .Where(r => r.RequesterId, ComparisonOperator.Eq, requesteeId)
        .And(r => r.RequesteeId, ComparisonOperator.Eq, requesterId)
      , tx);
    if (opposite is null)
    {
      var requestedAt = DateTime.UtcNow;
      await connection.DeleteAsync(Filter<JoinRequestDb>.Where(j => j.RequesterId, ComparisonOperator.Eq, requesterId), tx);
      await connection.InsertAsync(new JoinRequestDb(requesterId, requesteeId, requestedAt), tx);
      var createdBy = await userService.Get(requester.CreatedBy!);
      _ = Task.Run(async () =>
      {
        await pushService.Push(requestee.CreatedBy!,
          new Notification(Uuid7.Guid(), createdBy, requestedAt, $"{createdBy.Pseudo} souhaite rejoindre votre liane", $"{createdBy.Pseudo} souhaite rejoindre votre liane",
            $"liane://liane/{requesteeId}/match"));
        await hubService.PushLianeUpdateTo(requesteeId, requestee.CreatedBy!);
      });
      return null;
    }

    await connection.DeleteAsync(Filter<JoinRequestDb>.Where(j => j.RequesterId, ComparisonOperator.Eq, requesteeId)
      .And(r => r.RequesteeId, ComparisonOperator.Eq, requesterId), tx);

    var at = DateTime.UtcNow;
    var lianeId = Uuid7.Guid();

    var (main1, moved1) = await AddLianeMember(connection, requester, lianeId, at, tx);
    var (main2, moved2) = await AddLianeMember(connection, requestee, lianeId, at, tx);

    return new JoinRequestResult(at, lianeId, true, ImmutableList.Create(main1).Concat([main2]).Concat(moved1).Concat(moved2));
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

  public async Task<bool> Leave(Ref<Api.Community.Liane> lianeOrRequest)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var lianeOrRequestId = Guid.Parse(lianeOrRequest.Id);

    var lianeMemberDb = await lianeMessageService.TryGetMember(connection, lianeOrRequestId, userId, tx);
    if (lianeMemberDb is null)
    {
      return false;
    }

    var deleted = await connection.DeleteAsync(
      Filter<LianeMemberDb>.Where(l => l.LianeRequestId, ComparisonOperator.Eq, lianeMemberDb.LianeRequestId)
        .And(l => l.LianeId, ComparisonOperator.Eq, lianeMemberDb.LianeId), tx);
    tx.Commit();

    if (deleted == 0)
    {
      return false;
    }

    await eventDispatcher.Dispatch(lianeMemberDb.LianeId, new MessageContent.MemberLeft("", userId));

    return true;
  }

  private async Task<BestTrip> GetBestTrip(IDbConnection connection, Guid lianeRequestFrom, Guid? lianeRequestTo,
    IDbTransaction? tx = null)
  {
    var (wayPoints, arriveBefore, end) = await GetTrip(connection, lianeRequestFrom, tx);

    if (lianeRequestTo is null)
    {
      return new BestTrip(
        wayPoints,
        ImmutableHashSet.Create(wayPoints.First()),
        ImmutableHashSet.Create(wayPoints.Last()),
        arriveBefore,
        end
      );
    }

    var bestMatch = await matcher.FindMatchBetween(connection, lianeRequestFrom, lianeRequestTo.Value, tx);
    if (bestMatch is null)
    {
      return new BestTrip(
        wayPoints,
        ImmutableHashSet.Create(wayPoints.First()),
        ImmutableHashSet.Create(wayPoints.Last()),
        arriveBefore,
        end
      );
    }

    return new BestTrip(
      wayPoints.Insert(1, bestMatch.Pickup).Insert(2, bestMatch.Deposit).DistinctBy(w => w.Id).ToImmutableList(),
      ImmutableHashSet.Create(wayPoints.First(), bestMatch.Pickup),
      ImmutableHashSet.Create(wayPoints.Last(), bestMatch.Deposit),
      arriveBefore,
      end
    );
  }

  private async Task<(ImmutableList<RallyingPoint> wayPoints, TimeOnly arriveBefore, RallyingPoint end)> GetTrip(IDbConnection connection, Guid lianeRequestFrom, IDbTransaction? tx)
  {
    var liane = await lianeFetcher.TryFetchLiane(connection, lianeRequestFrom, tx);

    if (liane is not null)
    {
      return (liane.WayPoints, liane.ArriveBefore, liane.WayPoints.Last());
    }

    var resolvedLianeRequest = await lianeRequestFetcher.FetchLianeRequest(connection, lianeRequestFrom, tx);
    var wayPoints = await resolvedLianeRequest.WayPoints.SelectAsync(rallyingPointService.Get);
    var arriveBefore = resolvedLianeRequest.ArriveBefore;
    var end = wayPoints.Last();
    return (wayPoints, arriveBefore, end);
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

public sealed record JoinRequestDb(
  Guid RequesterId,
  Guid RequesteeId,
  DateTime RequestedAt
);

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

internal sealed record PendingRawMatch(
  Guid LianeRequestId,
  float Score,
  LatLng? Pickup,
  LatLng? Deposit,
  bool IsReverseDirection
);

internal enum IsMember
{
  Yes,
  No,
  Pending
}

[Union]
internal abstract record LianeOrRequest
{
  private LianeOrRequest()
  {
  }

  public abstract bool IsCurrentUser { get; init; }

  internal sealed record Liane(Api.Community.Liane Value, bool IsCurrentUser) : LianeOrRequest;

  internal sealed record Request(LianeRequest Value, bool IsCurrentUser) : LianeOrRequest;
}

internal record JoinRequestResult(DateTime At, Guid Liane, bool IsJoined, IEnumerable<MessageContent> Messages);

internal record BestTrip(
  ImmutableList<RallyingPoint> WayPoints,
  ImmutableHashSet<RallyingPoint> Sources,
  ImmutableHashSet<RallyingPoint> Destinations,
  TimeOnly ArriveBefore,
  Ref<RallyingPoint> At
);