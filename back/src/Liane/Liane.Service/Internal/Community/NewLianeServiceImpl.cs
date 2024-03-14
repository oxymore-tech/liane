using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using GeoJSON.Text.Geometry;
using Liane.Api.Chat;
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
using LianeMember = Liane.Api.Community.LianeMember;
using LianeRequest = Liane.Api.Community.LianeRequest;
using Match = Liane.Api.Community.Match;

namespace Liane.Service.Internal.Community;

using LianeRawMatch = (Guid, Guid, string, string[], float, LatLng, LatLng, string?, string?);

public sealed class NewLianeServiceImpl(
  PostgisDatabase db,
  ICurrentContext currentContext,
  IRoutingService routingService,
  IRallyingPointService rallyingPointService) : ILianeService
{
  public async Task<ImmutableList<LianeMatch>> List()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequests = await connection.QueryAsync(Query.Select<LianeRequestDb>()
      .Where(Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId))
      .OrderBy(r => r.Id));

    var lianes = (await FetchLianes(connection, lianeRequests.FilterSelect(r => r.LianeId)))
      .ToImmutableDictionary(l => l.Id);

    var constraints = (await connection.QueryAsync(Query.Select<TimeConstraintDb>()
        .Where(Filter<TimeConstraintDb>.Where(r => r.LianeRequestId, ComparisonOperator.In, lianeRequests.Select(l => l.Id)))))
      .GroupBy(c => c.LianeRequestId)
      .ToImmutableDictionary(g => g.Key, g => g.Select(c => new TimeConstraint(new TimeRange(c.Start, c.End), c.At, c.WeekDays)).ToImmutableList());

    var matches = (await FindMatches(connection, lianeRequests.Select(l => l.Id)))
      .GroupBy(m => m.Item1)
      .ToImmutableDictionary(g => g.Key, g => g.Select(m => m).ToImmutableList());

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
      return new LianeMatch(
        lianeRequest,
        l.LianeId?.ToString().GetOrDefault(i => lianes.GetValueOrDefault(i)),
        matches.GetValueOrDefault(l.Id, ImmutableList<LianeRawMatch>.Empty)
          .Select(m => new Match(m.Item2.ToString(), m.Item3, m.Item4.AsRef<RallyingPoint>(), m.Item8, m.Item9, m.Item5))
          .ToImmutableList()
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
    var lianeRequestDb = new LianeRequestDb(id, request.Name, wayPointsArray, request.RoundTrip, request.CanDrive, request.WeekDays, request.VacationStart, request.VacationEnd, null, userId,
      now);
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

  public async Task<Api.Community.Liane> Join(Ref<LianeRequest> mine, Ref<LianeRequest> foreign)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var from = await connection.GetAsync<LianeRequestDb, Guid>(Guid.Parse(mine.Id), tx);
    var to = await connection.GetAsync<LianeRequestDb, Guid>(Guid.Parse(foreign.Id), tx);

    var userId = currentContext.CurrentUser().Id;
    var now = DateTime.UtcNow;

    Guid lianeId;
    if (to.LianeId is null)
    {
      lianeId = Uuid7.Guid();

      await connection.InsertAsync(new LianeDb(lianeId, userId, now), tx);
      await connection.InsertAsync(new LianeMemberDb(lianeId, userId, now, null), tx);
      await connection.InsertAsync(new LianeMemberDb(lianeId, to.CreatedBy, now, null), tx);
      await connection.ExecuteAsync("UPDATE liane_request SET liane_id = @liane_id WHERE id = @from_id OR id = @to_id", new { liane_id = lianeId, from_id = from.Id, to_id = to.Id }, tx);
    }
    else
    {
      lianeId = to.LianeId.Value;
      await connection.InsertAsync(new LianeMemberDb(lianeId, userId, now, null), tx);
      await connection.ExecuteAsync("UPDATE liane_request SET liane_id = @liane_id WHERE id = @from_id OR id = @to_id", new { liane_id = lianeId, from_id = from.Id, to_id = to.Id }, tx);
    }

    var lianeMemberDbs = await connection.QueryAsync(Query.Select<LianeMemberDb>().Where(Filter<LianeMemberDb>.Where(m => m.LianeId, ComparisonOperator.Eq, lianeId)), tx);
    tx.Commit();
    return new Api.Community.Liane(lianeId.ToString(), userId, now, lianeMemberDbs.Select(m => new LianeMember(m.UserId, m.JoinedAt, m.LastReadAt)).ToImmutableList());
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

    await connection.ExecuteAsync("UPDATE liane_request SET liane_id = NULL WHERE liane_id = @liane_id", new { liane_id = lianeId }, tx);

    var rest = await connection.CountAsync("SELECT COUNT(*) FROM liane_member WHERE liane_id = @liane_id", new { liane_id = lianeId }, tx);
    if (rest == 0)
    {
      // await connection.ExecuteAsync("DELETE FROM liane_message WHERE id = @liane_id", new { liane_id = lianeId }, tx);
      await connection.ExecuteAsync("DELETE FROM liane WHERE id = @liane_id", new { liane_id = lianeId }, tx);
    }

    tx.Commit();
    return true;
  }

  public async Task<ChatMessage> SendMessage(Ref<Api.Community.Liane> liane, string message)
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
    return new ChatMessage(id.ToString(), userId, now, message);
  }

  private static async Task CheckIsMember(IDbConnection connection, Guid lianeId, string userId, IDbTransaction tx)
  {
    var count = await connection.CountAsync("SELECT COUNT(*) FROM liane_member WHERE liane_id = @liane_id AND user_id = @user_id", new { liane_id = lianeId, user_id = userId }, tx);
    if (count == 0)
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }
  }

  public async Task<PaginatedResponse<ChatMessage>> GetMessages(Ref<Api.Community.Liane> liane, Pagination pagination)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;

    var lianeId = Guid.Parse(liane.Id);
    await CheckIsMember(connection, lianeId, userId, tx);

    var query = Query.Select<LianeMessageDb>()
      .Where(Filter<LianeMessageDb>.Where(m => m.LianeId, ComparisonOperator.Eq, lianeId))
      .And(pagination.Cursor.ToFilter<LianeMessageDb>())
      .OrderBy(m => m.Id, pagination.SortAsc)
      .OrderBy(m => m.CreatedAt)
      .Take(pagination.Limit + 1);

    var result = await connection.QueryAsync(query, tx);

    var hasNext = result.Count > pagination.Limit;
    var cursor = hasNext ? pagination.Cursor?.Next(result.Last()) : null;
    return new PaginatedResponse<ChatMessage>(
      Math.Min(result.Count, pagination.Limit),
      cursor,
      result.Take(pagination.Limit).Select(m => new ChatMessage(m.Id.ToString(), m.CreatedBy, m.CreatedAt, m.Text)).ToImmutableList());
  }

  public Task<Api.Community.Liane> ReadAndGetLiane(Ref<Api.Community.Liane> id, Ref<Api.User.User> user, DateTime timestamp)
  {
    throw new NotImplementedException();
  }

  public Task<ImmutableList<Ref<Api.Community.Liane>>> GetUnreadLianes(Ref<Api.User.User> user)
  {
    throw new NotImplementedException();
  }

  /// <summary>
  /// Récupère toutes les lianes request en base qui matche entre 2 à 2.<br/>
  /// Pour que 2 liane_request matchent :
  /// <ul>
  ///   <li>il faut que leurs trajets se croisent.</li>
  ///   <li>avec une intersection dont la longueur est au moins égale à 35% du trajet demandé.</li>
  ///   <li>que si elle appartienne déjà une liane, ce soit la même.</li>
  /// </ul> 
  /// </summary>
  private static async Task<IEnumerable<LianeRawMatch>> FindMatches(IDbConnection connection, IEnumerable<Guid> lianeRequests, IDbTransaction? tx = null)
  {
    return await connection.QueryAsync<LianeRawMatch>("""
                                                              SELECT liane_request_a.id AS "from",
                                                                     liane_request_b.id AS liane_request,
                                                                     liane_request_b.created_by AS "user",
                                                                     liane_request_b.way_points AS way_points,
                                                                     st_length(intersection) / a_length AS score,
                                                                     st_startpoint(intersection) AS pickup,
                                                                     st_endpoint(intersection) AS deposit,
                                                                     nearest_rp(st_startpoint(intersection)) AS pickup_point,
                                                                     nearest_rp(st_endpoint(intersection)) AS deposit_point
                                                              FROM (
                                                                      SELECT a.way_points AS a,
                                                                             b.way_points AS b,
                                                                             st_linemerge(st_intersection(a.geometry, b.geometry)) intersection,
                                                                             st_length(a.geometry) AS a_length
                                                                      FROM route a
                                                                        INNER JOIN route b ON st_intersects(a.geometry, b.geometry)
                                                                  ) AS matches
                                                              INNER JOIN liane_request liane_request_a ON liane_request_a.way_points = a
                                                              INNER JOIN liane_request liane_request_b ON
                                                                liane_request_b.way_points = b AND liane_request_b.created_by != liane_request_a.created_by
                                                              WHERE st_length(intersection) / a_length > 0.3 AND liane_request_a.id = ANY(@liane_requests)
                                                              ORDER BY st_length(intersection) / a_length DESC, liane_request_a.id;
                                                      """,
      new { liane_requests = lianeRequests.ToArray() },
      tx
    );
  }

  private async Task<ImmutableList<Api.Community.Liane>> FetchLianes(IDbConnection connection, IEnumerable<Guid> lianeFilter)
  {
    var lianeDbs = await connection.QueryAsync(Query.Select<LianeDb>().Where(Filter<LianeDb>.Where(l => l.Id, ComparisonOperator.In, lianeFilter)));
    var memberDbs = (await connection.QueryAsync(Query.Select<LianeMemberDb>().Where(Filter<LianeMemberDb>.Where(m => m.LianeId, ComparisonOperator.In, lianeFilter))))
      .GroupBy(lm => lm.LianeId)
      .ToImmutableDictionary(g => g.Key, g => g.ToImmutableList());
    return lianeDbs.Select(l =>
    {
      var members = memberDbs.GetValueOrDefault(l.Id, ImmutableList<LianeMemberDb>.Empty);
      return new Api.Community.Liane(
        l.Id.ToString(),
        l.CreatedBy,
        l.CreatedAt,
        members.Select(m => new LianeMember(m.UserId, m.JoinedAt, m.LastReadAt)).ToImmutableList()
      );
    }).ToImmutableList();
  }
}

public sealed record LianeMemberDb(
  Guid LianeId,
  Ref<Api.User.User> UserId,
  DateTime JoinedAt,
  DateTime? LastReadAt
);

public sealed record LianeDb(
  Guid Id,
  Ref<Api.User.User> CreatedBy,
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
  Guid? LianeId,
  Ref<Api.User.User> CreatedBy,
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
  Ref<Api.User.User> CreatedBy,
  DateTime? CreatedAt
) : IEntity<Guid>;