using System;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using GeoJSON.Text.Geometry;
using Liane.Api.Community;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Sql;
using UuidExtensions;
using LianeMatch = Liane.Api.Community.LianeMatch;
using LianeRequest = Liane.Api.Community.LianeRequest;
using Match = Liane.Api.Community.Match;

namespace Liane.Service.Internal.Community;

public sealed class LianeServiceImpl(
  PostgisDatabase db,
  ICurrentContext currentContext,
  IRoutingService routingService,
  IRallyingPointService rallyingPointService,
  LianeFetcher fetcher,
  LianeMatcher matcher) : ILianeService
{
  public async Task<ImmutableList<LianeMatch>> List()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequests = await connection.QueryAsync(Query.Select<LianeRequestDb>()
      .Where(Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId))
      .OrderBy(r => r.Id));

    var joinedLianeIds = (await connection.QueryAsync(Query.Select<LianeMemberDb>()
        .Where(Filter<LianeMemberDb>.Where(m => m.UserId, ComparisonOperator.Eq, userId))
        .OrderBy(r => r.JoinedAt)))
      .GroupBy(m => m.LianeRequestId)
      .ToImmutableDictionary(m => m.Key, g => g.Select(l => l.LianeId.ToString()).ToImmutableHashSet());

    var lianeRequestsId = lianeRequests.Select(l => l.Id);
    var constraints = (await connection.QueryAsync(Query.Select<TimeConstraintDb>()
        .Where(Filter<TimeConstraintDb>.Where(r => r.LianeRequestId, ComparisonOperator.In, lianeRequestsId))))
      .GroupBy(c => c.LianeRequestId)
      .ToImmutableDictionary(g => g.Key, g => g.Select(c => new TimeConstraint(new TimeRange(c.Start, c.End), c.At, c.WeekDays)).ToImmutableList());

    var allMatches = await matcher.FindMatches(connection, lianeRequestsId);

    return lianeRequests.Select(l =>
    {
      var lianeRequest = new LianeRequest(
        l.Id.ToString(),
        l.Name,
        l.WayPoints.AsRef<RallyingPoint>(),
        l.RoundTrip,
        l.CanDrive,
        l.WeekDays,
        constraints.GetValueOrDefault(l.Id, ImmutableList<TimeConstraint>.Empty),
        l.VacationStart,
        l.VacationEnd,
        l.CreatedBy,
        l.CreatedAt
      );
      var (joinedLianes, matches) = allMatches.GetValueOrDefault(l.Id, ImmutableList<Match>.Empty)
        .Split(joinedLianeIds.GetValueOrDefault(l.Id, ImmutableHashSet<string>.Empty));
      return new LianeMatch(
        lianeRequest,
        joinedLianes,
        matches
      );
    }).ToImmutableList();
  }

  public async Task<LianeRequest> Create(LianeRequest request)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var id = Uuid7.Guid();

    await connection.InsertMultipleAsync(request.TimeConstraints.Select(c => new TimeConstraintDb(id, c.When.Start, c.When.End, c.At, c.WeekDays)), tx);

    var wayPoints = request.WayPoints.Distinct().ToImmutableList();
    if (wayPoints.Count <= 1)
    {
      throw new ArgumentException("At least 2 waypoints are required");
    }

    var wayPointsArray = request.WayPoints.Deref();
    var coordinates = (await request.WayPoints.SelectAsync(rallyingPointService.Get))
      .Select(w => w.Location);
    var route = await routingService.GetRoute(coordinates);
    await connection.InsertAsync(new RouteDb(wayPointsArray, route.Coordinates.ToLineString()), tx);

    var now = DateTime.UtcNow;
    var lianeRequestDb = new LianeRequestDb(id, request.Name, wayPointsArray, request.RoundTrip, request.CanDrive, request.WeekDays, request.VacationStart, request.VacationEnd, userId, now);
    await connection.InsertAsync(lianeRequestDb, tx);

    tx.Commit();
    return new LianeRequest(
      id.ToString(),
      lianeRequestDb.Name,
      request.WayPoints,
      lianeRequestDb.RoundTrip,
      lianeRequestDb.CanDrive,
      lianeRequestDb.WeekDays,
      request.TimeConstraints,
      lianeRequestDb.VacationStart,
      lianeRequestDb.VacationEnd,
      lianeRequestDb.CreatedBy,
      lianeRequestDb.CreatedAt
    );
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

    var existingLiane = await fetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();
    return existingLiane;
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

    var createdLiane = await fetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();
    return createdLiane;
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

  public async Task<LianeMessage> SendMessage(Ref<Api.Community.Liane> liane, string message)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;
    var lianeId = Guid.Parse(liane.Id);
    await CheckIsMember(connection, lianeId, userId, tx);

    var id = Uuid7.Guid();
    var now = DateTime.UtcNow;
    await connection.InsertAsync(new LianeMessageDb(id, lianeId, message, userId, now), tx);
    tx.Commit();
    return new LianeMessage.Chat(id.ToString(), userId, now, message);
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
    var member = await MarkAsRead(connection, lianeId, tx);

    var filter = Filter<LianeMessageDb>.Where(m => m.LianeId, ComparisonOperator.Eq, lianeId)
                 & Filter<LianeMessageDb>.Where(m => m.CreatedAt, ComparisonOperator.Gt, member.JoinedAt);

    var query = Query.Select<LianeMessageDb>()
      .Where(filter)
      .And(pagination.ToFilter<LianeMessageDb>())
      .OrderBy(m => m.Id, pagination.SortAsc)
      .OrderBy(m => m.CreatedAt)
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
        .Select(m => new LianeMessage.Chat(m.Id.ToString(), m.CreatedBy, m.CreatedAt, m.Text))
        .Cast<LianeMessage>()
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

  private async Task<LianeMemberDb> MarkAsRead(IDbConnection connection, Guid lianeId, IDbTransaction tx)
  {
    var userId = currentContext.CurrentUser().Id;

    var update = Query.Update<LianeMemberDb>()
      .Set(m => m.LastReadAt, DateTime.UtcNow)
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
  DateTime? VacationStart,
  DateTime? VacationEnd,
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
  string Text,
  Ref<Api.Auth.User> CreatedBy,
  DateTime? CreatedAt
) : IEntity<Guid>;