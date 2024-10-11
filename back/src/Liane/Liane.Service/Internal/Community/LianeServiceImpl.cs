using System;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Sql;
using NetTopologySuite.Geometries;
using UuidExtensions;
using LianeMatch = Liane.Api.Community.LianeMatch;
using LianeRequest = Liane.Api.Community.LianeRequest;
using LianeState = Liane.Api.Community.LianeState;
using Match = Liane.Api.Community.Match;

namespace Liane.Service.Internal.Community;

public sealed class LianeServiceImpl(
  PostgisDatabase db,
  ICurrentContext currentContext,
  IRoutingService routingService,
  IRallyingPointService rallyingPointService,
  LianeFetcher lianeFetcher,
  LianeRequestFetcher lianeRequestFetcher,
  LianeMatcher matcher,
  IPushService pushService,
  ITripService tripService,
  EventDispatcher eventDispatcher) : ILianeService
{
  public async Task<LianeRequest> Create(LianeRequest request)
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

    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var id = request.Id ?? Uuid7.Guid();

    var wayPointsArray = request.WayPoints.Deref();
    var coordinates = (await request.WayPoints.SelectAsync(rallyingPointService.Get))
      .Select(w => w.Location)
      .ToImmutableList();
    var route = await routingService.GetRoute(coordinates);
    await connection.MergeAsync(new RouteDb(wayPointsArray, route.Coordinates.ToLineString()), tx);

    if (request.RoundTrip)
    {
      var reverseRoute = await routingService.GetRoute(coordinates.Reverse());
      await connection.MergeAsync(new RouteDb(wayPointsArray.Reverse().ToArray(), reverseRoute.Coordinates.ToLineString()), tx);
    }

    var now = DateTime.UtcNow;
    var lianeRequestDb = new LianeRequestDb(id, request.Name, wayPointsArray, request.RoundTrip, request.ArriveBefore, request.ReturnAfter, request.CanDrive, request.WeekDays, request.IsEnabled,
      userId, now);

    await connection.InsertAsync(lianeRequestDb, tx);

    tx.Commit();

    var created = await lianeRequestFetcher.FetchLianeRequest(connection, id, tx);

    return created;
  }

  public async Task<ImmutableList<LianeMatch>> List()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequests = await lianeRequestFetcher.FetchLianeRequests(connection, Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId));

    var linkedTo = (await connection.QueryAsync(Query.Select<LianeMemberDb>()
        .Where(Filter<LianeMemberDb>.Where(m => m.LianeRequestId, ComparisonOperator.In, lianeRequests.Select(r => r.Id!.Value)))))
      .ToImmutableDictionary(m => m.LianeRequestId);

    var lianeFilter = linkedTo.Values.Select(s => s.LianeId).ToImmutableList();

    var matches = await matcher.FindMatches(connection, lianeFilter);
    var linkedToLianes = await lianeFetcher.FetchLianes(connection, lianeFilter);

    return lianeRequests.Select(r =>
    {
      if (linkedTo.TryGetValue(r.Id!.Value, out var member))
      {
        var liane = linkedToLianes[member.LianeId];
        return new LianeMatch(
          r,
          member.JoinedAt is null
            ? new LianeState.Pending(liane)
            : new LianeState.Attached(liane)
        );
      }

      var result = matches.GetValueOrDefault(r.Id!.Value, ImmutableList<Match>.Empty);
      return new LianeMatch(
        r,
        new LianeState.Detached(result)
      );
    }).ToImmutableList();
  }

  public async Task<LianeRequest> Update(Ref<LianeRequest> id, LianeRequest request)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    var lianeRequestId = Guid.Parse(id);

    var updated = await connection.UpdateAsync(Query.Update<LianeRequestDb>()
      .Set(r => r.Name, request.Name)
      .Set(r => r.IsEnabled, request.IsEnabled)
      .Set(r => r.RoundTrip, request.RoundTrip)
      .Where(r => r.Id, ComparisonOperator.Eq, lianeRequestId)
      .And(r => r.CreatedBy, ComparisonOperator.Eq, userId));

    if (updated == 0)
    {
      throw new UnauthorizedAccessException("User is not the owner of the liane request");
    }

    var lianeRequestDb = await connection.GetAsync<LianeRequestDb>(lianeRequestId);

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
    var lianeRequestId = Guid.Parse(id);

    var deleted = await connection.DeleteAsync(
      Filter<LianeRequestDb>.Where(r => r.Id, ComparisonOperator.Eq, lianeRequestId)
      & Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId)
    );

    if (deleted == 0)
    {
      throw new ResourceNotFoundException($"Liane request '{lianeRequestId}' not found or not belong to current user");
    }
  }

  public async Task<bool> JoinRequest(Ref<LianeRequest> mine, Ref<Api.Community.Liane> foreign)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var mineId = mine.IdAsGuid();

    var iAmAlreadyMember = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, mineId), tx);
    if (iAmAlreadyMember?.JoinedAt is not null)
    {
      return false;
    }

    var foreignId = foreign.IdAsGuid();

    var alreadyMember = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, foreignId), tx);

    var lianeId = alreadyMember?.LianeId ?? foreignId;

    var from = await connection.GetAsync<LianeRequestDb, Guid>(mineId, tx);

    await connection.MergeAsync(new LianeMemberDb(from.Id, lianeId, DateTime.UtcNow, null, null), tx);

    tx.Commit();
    return true;
  }

  public async Task<Api.Community.Liane> Accept(Ref<LianeRequest> lianeRequest, Ref<Api.Community.Liane> foreign)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var foreignId = foreign.IdAsGuid();

    var foreignLiane = await lianeFetcher.FetchLiane(connection, foreignId, tx);
    if (foreignLiane.Members.Count > 0 && foreignLiane.Members.All(m => m.User.Id != userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    var resolvedLianeRequest = await connection.GetAsync<LianeRequestDb>(lianeRequest.IdAsGuid(), tx);

    var alreadyMember = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, foreignId), tx);

    var lianeId = alreadyMember?.LianeId ?? foreignId;
    if (alreadyMember is null)
    {
      await connection.MergeAsync(new LianeMemberDb(lianeId, lianeId, DateTime.UtcNow, DateTime.UtcNow, null), tx);
    }

    var updated = await connection.UpdateAsync(Query.Update<LianeMemberDb>()
      .Where(m => m.LianeRequestId, ComparisonOperator.Eq, lianeRequest.IdAsGuid())
      .And(m => m.LianeId, ComparisonOperator.Eq, lianeId)
      .Set(m => m.JoinedAt, DateTime.UtcNow), tx);

    if (updated == 0)
    {
      throw new ResourceNotFoundException($"No join request found between {lianeRequest} and {lianeId}");
    }

    var liane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();

    var memberAccepted = new LianeEvent.MemberAccepted(liane.Id, resolvedLianeRequest.Id, resolvedLianeRequest.CreatedBy);
    await eventDispatcher.Dispatch(memberAccepted, userId);
    return liane;
  }

  public async Task<Api.Community.Liane> Reject(Ref<LianeRequest> lianeRequest, Ref<Api.Community.Liane> foreign)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var lianeId = foreign.IdAsGuid();

    var foreignLiane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    if (foreignLiane.Members.Count > 0 && foreignLiane.Members.All(m => m.User.Id != userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    var deleted = await connection.DeleteAsync(Filter<LianeMemberDb>
      .Where(m => m.LianeRequestId, ComparisonOperator.Eq, lianeRequest.IdAsGuid())
      .And(m => m.LianeId, ComparisonOperator.Eq, lianeId)
      .And(m => m.JoinedAt, ComparisonOperator.Eq, null), tx);

    if (deleted == 0)
    {
      throw new ResourceNotFoundException($"No join request found between {lianeRequest} and {lianeId}");
    }

    var resolvedLianeRequest = await connection.GetAsync<LianeRequestDb>(lianeRequest.IdAsGuid(), tx);

    var liane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();

    var memberRejected = new LianeEvent.MemberRejected(liane.Id, resolvedLianeRequest.Id, resolvedLianeRequest.CreatedBy, null);
    await eventDispatcher.Dispatch(memberRejected, userId);
    return liane;
  }

  public async Task<Api.Community.Liane> Get(Ref<Api.Community.Liane> id)
  {
    using var connection = db.NewConnection();
    var userId = currentContext.CurrentUser().Id;

    var liane = await lianeFetcher.FetchLiane(connection, id.IdAsGuid());
    if (!liane.IsMember(userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    return liane;
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
    var lianeMemberDb = await TryGetMember(connection, lianeId, userId, tx);
    if (lianeMemberDb is null)
    {
      return false;
    }

    await connection.ExecuteAsync("DELETE FROM liane_member WHERE liane_id = @liane_id AND liane_request_id = @liane_request_id",
      new { liane_id = lianeMemberDb.LianeId, liane_request_id = lianeMemberDb.LianeRequestId }, tx);
    tx.Commit();
    return true;
  }

  public async Task<LianeMessage> SendMessage(Ref<Api.Community.Liane> liane, MessageContent content)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;
    var lianeId = Guid.Parse(liane.Id);
    var resolvedLiane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    if (!resolvedLiane.IsMember(userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    var id = Uuid7.Guid();
    var now = DateTime.UtcNow;
    await connection.MergeAsync(new LianeMessageDb(id, lianeId, content, userId, now), tx);
    var lianeMessage = new LianeMessage(id.ToString(), userId, now, content);

    await pushService.PushMessage(lianeId, lianeMessage);
    tx.Commit();
    return lianeMessage;
  }

  public async Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Api.Community.Liane> liane, Pagination pagination)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var lianeId = liane.IdAsGuid();
    var member = await MarkAsRead(connection, lianeId, tx, DateTime.UtcNow);

    var filter = Filter<LianeMessageDb>.Where(m => m.LianeId, ComparisonOperator.Eq, lianeId)
                 & Filter<LianeMessageDb>.Where(m => m.CreatedAt, ComparisonOperator.Gt, member.JoinedAt);

    var query = Query.Select<LianeMessageDb>()
      .Where(filter)
      .And(pagination.ToFilter<LianeMessageDb>())
      .OrderBy(m => m.Id, false)
      .OrderBy(m => m.CreatedAt, false)
      .Take(pagination.Limit + 1);

    var total = await connection.QuerySingleAsync<int>(Query.Count<LianeMessageDb>().Where(filter), tx);
    var result = await connection.QueryAsync(query, tx);

    tx.Commit();

    var hasNext = result.Count > pagination.Limit;
    var cursor = hasNext ? result.Last().ToCursor() : null;
    return new PaginatedResponse<LianeMessage>(
      Math.Min(result.Count, pagination.Limit),
      cursor,
      result.Take(pagination.Limit)
        .Select(m => new LianeMessage(m.Id.ToString(), m.CreatedBy, m.CreatedAt, m.Content))
        .ToImmutableList(),
      total);
  }

  public async Task<ImmutableDictionary<Ref<Api.Community.Liane>, int>> GetUnreadLianes()
  {
    using var connection = db.NewConnection();
    var userId = currentContext.CurrentUser().Id;
    var unread = await connection.QueryAsync<(Guid, int)>("""
                                                          SELECT m.liane_id, COUNT(msg.id) AS unread
                                                          FROM liane_member m
                                                            INNER JOIN liane_request r ON m.liane_request_id = r.id
                                                            LEFT JOIN liane_message msg ON msg.liane_id = m.liane_id AND msg.created_at > m.joined_at
                                                          WHERE m.joined_at IS NOT NULL AND r.created_by = @userId
                                                            AND (m.last_read_at IS NULL OR msg.created_at > m.last_read_at)
                                                          GROUP BY m.liane_id
                                                          """,
      new { userId }
    );
    return unread.ToImmutableDictionary(m => (Ref<Api.Community.Liane>)m.Item1.ToString(), m => m.Item2);
  }

  public async Task MarkAsRead(Ref<Api.Community.Liane> liane, DateTime timestamp)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var lianeId = Guid.Parse(liane.Id);
    await MarkAsRead(connection, lianeId, tx, timestamp);
    tx.Commit();
  }

  private async Task<LianeMemberDb> MarkAsRead(IDbConnection connection, Guid lianeId, IDbTransaction tx, DateTime now)
  {
    var lianeMemberDb = await CheckIsMember(connection, lianeId, tx: tx);

    var update = Query.Update<LianeMemberDb>()
      .Set(m => m.LastReadAt, now)
      .Where(l => l.LianeRequestId, ComparisonOperator.Eq, lianeMemberDb.LianeRequestId)
      .And(l => l.LianeId, ComparisonOperator.Eq, lianeMemberDb.LianeId);
    await connection.UpdateAsync(update, tx);

    return lianeMemberDb with { LastReadAt = now };
  }

  private async Task<LianeMemberDb> CheckIsMember(IDbConnection connection, Guid lianeId, string? userId = null, IDbTransaction? tx = null)
  {
    var lianeMemberDb = await TryGetMember(connection, lianeId, userId, tx);

    if (lianeMemberDb is null)
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    return lianeMemberDb;
  }

  private async Task<LianeMemberDb?> TryGetMember(IDbConnection connection, Guid lianeId, string? userId, IDbTransaction? tx)
  {
    var userIdValue = userId ?? currentContext.CurrentUser().Id;
    var lianeMemberDb = await connection.QueryFirstOrDefaultAsync<LianeMemberDb>("""
                                                                                 SELECT liane_member.liane_request_id, liane_member.liane_id, liane_member.requested_at, liane_member.joined_at, liane_member.last_read_at
                                                                                 FROM liane_member
                                                                                   INNER JOIN liane_request ON liane_member.liane_request_id = liane_request.id
                                                                                 WHERE liane_member.liane_id = @lianeId AND liane_request.created_by = @userId
                                                                                 """, new { userId = userIdValue, lianeId }, tx);
    return lianeMemberDb;
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
  DateTime CreatedAt
) : IIdentity<Guid>;

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