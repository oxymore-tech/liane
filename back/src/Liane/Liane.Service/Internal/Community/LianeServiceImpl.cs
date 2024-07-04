using System;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using GeoJSON.Text.Geometry;
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
using UuidExtensions;
using LianeMatch = Liane.Api.Community.LianeMatch;
using LianeRequest = Liane.Api.Community.LianeRequest;
using LianeUpdate = Liane.Api.Community.LianeUpdate;

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

    await connection.InsertMultipleAsync(request.TimeConstraints.Select(c => new TimeConstraintDb(id, c.When.Start, c.When.End, c.At, c.WeekDays)), tx);

    var wayPointsArray = request.WayPoints.Deref();
    var coordinates = (await request.WayPoints.SelectAsync(rallyingPointService.Get))
      .Select(w => w.Location);
    var route = await routingService.GetRoute(coordinates);
    await connection.InsertAsync(new RouteDb(wayPointsArray, route.Coordinates.ToLineString()), tx);

    var now = DateTime.UtcNow;
    var lianeRequestDb = new LianeRequestDb(id, request.Name, wayPointsArray, request.RoundTrip, request.CanDrive, request.WeekDays, request.IsEnabled, userId, now);

    var query = Query.Insert(lianeRequestDb)
      .UpdateOnConflict(r => r.WayPoints, r => r.CreatedBy)
      .ReturnsId(r => r.Id);
    var createdId = await connection.InsertAsync(query, tx);

    var created = await lianeRequestFetcher.FetchLianeRequest(connection, createdId, tx);

    tx.Commit();
    return created;
  }

  public async Task<ImmutableList<LianeMatch>> List()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequests = await lianeRequestFetcher.FetchLianeRequests(connection, Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId));

    var joinedLianeIds = (await connection.QueryAsync(Query.Select<LianeMemberDb>()
        .Where(Filter<LianeMemberDb>.Where(m => m.UserId, ComparisonOperator.Eq, userId))
        .OrderBy(r => r.JoinedAt)))
      .Select(m => m.LianeId)
      .ToImmutableHashSet();

    var matches = await matcher.FindMatches(connection, lianeRequests.Select(r => r.Id!.Value), joinedLianeIds);

    return lianeRequests.Select(r =>
    {
      var result = matches.GetValueOrDefault(r.Id!.Value, LianeMatcherResult.Empty);
      return new LianeMatch(
        r,
        result.JoindedLianes,
        result.Matches
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

    var constraints = (await connection.QueryAsync(Query.Select<TimeConstraintDb>()
        .Where(Filter<TimeConstraintDb>.Where(r => r.LianeRequestId, ComparisonOperator.Eq, lianeRequestId))))
      .Select(c => new TimeConstraint(new TimeRange(c.Start, c.End), c.At, c.WeekDays)).ToImmutableList();

    return new LianeRequest(
      lianeRequestDb.Id,
      lianeRequestDb.Name,
      await lianeRequestDb.WayPoints.AsRef<RallyingPoint>(rallyingPointService.Get),
      lianeRequestDb.RoundTrip,
      lianeRequestDb.CanDrive,
      lianeRequestDb.WeekDays,
      constraints,
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

  public async Task<Api.Community.Liane> Join(Ref<LianeRequest> mine, Ref<Api.Community.Liane> liane)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var from = await connection.GetAsync<LianeRequestDb, Guid>(Guid.Parse(mine.Id), tx);

    var userId = currentContext.CurrentUser().Id;
    var now = DateTime.UtcNow;

    var lianeId = Guid.Parse(liane);

    await connection.InsertAsync(new LianeMemberDb(lianeId, from.Id, userId, now, null), tx);

    var existingLiane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();
    return existingLiane;
  }

  public async Task<Api.Community.Liane> Get(Ref<Api.Community.Liane> id)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;
    var lianeId = Guid.Parse(id);
    await CheckIsMember(connection, lianeId, userId, tx);
    return await lianeFetcher.FetchLiane(connection, lianeId);
  }

  public async Task<Api.Community.Liane> JoinNew(Ref<LianeRequest> mine, Ref<LianeRequest> foreign)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var from = await connection.GetAsync<LianeRequestDb, Guid>(Guid.Parse(mine.Id), tx);
    var to = await connection.GetAsync<LianeRequestDb, Guid>(Guid.Parse(foreign.Id), tx);

    var userId = currentContext.CurrentUser().Id;
    var now = DateTime.UtcNow;

    var lianeId = Uuid7.Guid();

    await connection.InsertAsync(new LianeDb(lianeId, to.Name, userId, now), tx);
    await connection.InsertAsync(new LianeMemberDb(lianeId, from.Id, userId, now, null), tx);
    await connection.InsertAsync(new LianeMemberDb(lianeId, to.Id, to.CreatedBy, now, null), tx);

    var createdLiane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();
    return createdLiane;
  }

  public async Task JoinTrip(JoinTripQuery query)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;
    var lianeId = Guid.Parse(query.Liane);
    var member = await CheckIsMember(connection, lianeId, userId, tx);
    var trip = await tripService.Get(query.Trip);
    var driver = await CheckIsMember(connection, lianeId, trip.Driver.User, tx);

    var match = await matcher.FindMatchesBetween(connection, member.LianeRequestId, driver.LianeRequestId, tx);
    if (match is null)
    {
      return;
    }

    var direction = CheckDirection(match.LianeRequest.WayPoints, trip.WayPoints);
    var (pickup, deposit) = direction == Direction.Outbound
      ? (match.Pickup, match.Deposit)
      : (match.Deposit, match.Pickup);
    var title = direction == Direction.Outbound
      ? "Je souhaites rejoindre le trajet"
      : "Je souhaite rejoindre le trajet retour";
    await eventDispatcher.Dispatch(new LianeEvent.JoinRequest(query.Trip, pickup, deposit, -1, false, title, query.GeolocationLevel ?? GeolocationLevel.None));
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

  public async Task<Api.Community.Liane> Update(Ref<Api.Community.Liane> id, LianeUpdate liane)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;
    var lianeId = Guid.Parse(id);
    await CheckIsMember(connection, lianeId, userId, tx);

    var updated = await connection.UpdateAsync(Query.Update<LianeRequestDb>()
      .Set(r => r.Name, liane.Name)
      .Where(r => r.Id, ComparisonOperator.Eq, lianeId), tx);

    if (updated == 0)
    {
      throw new ResourceNotFoundException($"Liane '{lianeId}' not found");
    }

    var updatedLiane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();
    return updatedLiane;
  }

  public async Task<bool> Leave(Ref<Api.Community.Liane> liane)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var lianeId = Guid.Parse(liane.Id);
    var updated = await connection.ExecuteAsync("DELETE FROM liane_member WHERE liane_id = @liane_id AND user_id = @user_id", new { liane_id = lianeId, user_id = userId }, tx);
    if (updated == 0)
    {
      return false;
    }

    var rest = await connection.CountAsync("SELECT COUNT(*) FROM liane_member WHERE liane_id = @liane_id", new { liane_id = lianeId }, tx);
    if (rest == 0)
    {
      // await connection.ExecuteAsync("DELETE FROM liane_message WHERE id = @liane_id", new { liane_id = lianeId }, tx);
      await connection.ExecuteAsync("DELETE FROM liane WHERE id = @liane_id", new { liane_id = lianeId }, tx);
    }

    tx.Commit();
    return true;
  }

  public async Task<LianeMessage> SendMessage(Ref<Api.Community.Liane> liane, MessageContent content)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;
    var lianeId = Guid.Parse(liane.Id);
    await CheckIsMember(connection, lianeId, userId, tx);
    var resolvedLiane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    var id = Uuid7.Guid();
    var now = DateTime.UtcNow;
    await connection.InsertAsync(new LianeMessageDb(id, lianeId, content, userId, now), tx);
    var lianeMessage = new LianeMessage(id.ToString(), userId, now, content);
    var recipients = resolvedLiane.Members.Where(m => m.User.Id != userId)
      .Select(m => m.User)
      .ToImmutableList();
    await pushService.SendLianeMessage(recipients, lianeId, lianeMessage);
    tx.Commit();
    return lianeMessage;
  }

  private static async Task<LianeMemberDb> CheckIsMember(IDbConnection connection, Guid lianeId, string userId, IDbTransaction tx)
  {
    var query = Query.Select<LianeMemberDb>()
      .Where(l => l.LianeId, ComparisonOperator.Eq, lianeId)
      .And(l => l.UserId, ComparisonOperator.Eq, userId);
    var member = await connection.FirstOrDefaultAsync(query, tx);
    if (member is null)
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    return member;
  }

  public async Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Api.Community.Liane> liane, Pagination pagination)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var lianeId = Guid.Parse(liane.Id);
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
                                                                   LEFT JOIN liane_message msg ON msg.liane_id = m.liane_id
                                                          WHERE m.user_id = @userId
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
    var userId = currentContext.CurrentUser().Id;

    var update = Query.Update<LianeMemberDb>()
      .Set(m => m.LastReadAt, now)
      .Where(l => l.LianeId, ComparisonOperator.Eq, lianeId)
      .And(l => l.UserId, ComparisonOperator.Eq, userId);
    var updated = await connection.UpdateAsync(update, tx);

    if (updated < 1)
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    return await CheckIsMember(connection, lianeId, userId, tx);
  }
}

public sealed record LianeMemberDb(
  Guid LianeId,
  Guid LianeRequestId,
  Ref<Api.Auth.User> UserId,
  DateTime JoinedAt,
  DateTime? LastReadAt
);

public sealed record LianeDb(
  Guid Id,
  string Name,
  Ref<Api.Auth.User> CreatedBy,
  DateTime CreatedAt
);

public sealed record LianeRequestDb(
  Guid Id,
  string Name,
  string[] WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  bool IsEnabled,
  Ref<Api.Auth.User> CreatedBy,
  DateTime CreatedAt
) : IIdentity<Guid>;

public sealed record TimeConstraintDb(
  Guid LianeRequestId,
  TimeOnly Start,
  TimeOnly? End,
  string At,
  DayOfWeekFlag WeekDays
);

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

enum Direction { Outbound, Inbound };