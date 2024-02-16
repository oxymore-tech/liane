using System;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Dapper;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Sql;
using UuidExtensions;

namespace Liane.Service.Internal.Liane;

public sealed class NewLianeServiceImpl(
  PostgisDatabase db,
  ICurrentContext currentContext,
  IRoutingService routingService,
  IRallyingPointService rallyingPointService)
{
  public async Task<ImmutableList<Liane>> List()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianes = await connection.QueryAsync(Query.Select<LianeDb>()
      .Where(Filter<LianeDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId)));

    var constraints = (await connection.QueryAsync(Query.Select<TimeConstraintDb>()
        .Where(Filter<TimeConstraintDb>.Where(r => r.LianeId, ComparisonOperator.In, lianes.Select(l => l.Id)))))
      .GroupBy(c => c.LianeId)
      .ToImmutableDictionary(g => g.Key, g => g.Select(c => new TimeConstraint(new TimeRange(c.Start, c.End), c.At, c.WeekDays)).ToImmutableList());

    var lianeMatch = await connection.QueryAsync<(Guid, Guid, string, string[], float)>("""
                                                                                            SELECT liane_a.id AS "from",
                                                                                                   liane_b.id AS liane,
                                                                                                   liane_b.created_by AS "user",
                                                                                                   liane_b.way_points AS way_points,
                                                                                                   score,
                                                                                                   st_startpoint(intersection) AS pickup,
                                                                                                   st_endpoint(intersection) AS deposit
                                                                                            FROM (
                                                                                                    SELECT a.way_points AS a,
                                                                                                           b.way_points AS b,
                                                                                                           st_linemerge(st_intersection(a.geometry, b.geometry)) intersection,
                                                                                                           st_length(st_intersection(a.geometry, b.geometry)) / st_length(a.geometry) as score
                                                                                                    FROM route a
                                                                                                             INNER JOIN route b ON st_overlaps(a.geometry, b.geometry)
                                                                                                ) AS matches
                                                                                            INNER JOIN liane liane_a ON liane_a.way_points = a
                                                                                            INNER JOIN liane liane_b ON liane_b.way_points = b
                                                                                            WHERE score > 0.3 AND liane_a.id = ANY(@lianes)
                                                                                            ORDER BY score DESC, liane_a.id;
                                                                                        """, new { lianes = lianes.Select(l => l.Id).ToArray() });

    return lianes.Select(l => new Liane(
      l.Id.ToString(),
      l.Name,
      l.WayPoints.AsRef<RallyingPoint>(),
      l.RoundTrip,
      l.CanDrive,
      l.WeekDays,
      constraints.GetValueOrDefault(l.Id, ImmutableList<TimeConstraint>.Empty),
      l.VacationStart,
      l.VacationEnd,
      lianeMatch.Select(m => new Match(m.Item2.ToString(), m.Item3, m.Item4.AsRef<RallyingPoint>(), null, null, m.Item5)).ToImmutableList(),
      l.CreatedBy,
      l.CreatedAt
    )).ToImmutableList();
  }

  public async Task FindMatches()
  {
    using var connection = db.NewConnection();
    // TODO
    // Prendre toutes les lianes en base
    // Pour chaque liane, resoudre la geometry du trajet en fonction des waypoints
    // Regrouper ces lianes par clusters des geometries qui sintersect
    // Pour chaque cluster, faire des sous ensembles de lianes qui ont des contraintes compatibles

    var lianeMatches = await connection.QueryAsync<Guid>("""
                                                             SELECT liane_a.id, liane_b.id, ratio, intersection
                                                             FROM (
                                                                     SELECT a.way_points AS a,
                                                                            b.way_points AS b,
                                                                            st_intersection(a.geometry, b.geometry) intersection,
                                                                            st_length(st_intersection(a.geometry, b.geometry)) / st_length(a.geometry) as ratio
                                                                     FROM route a
                                                                              INNER JOIN route b ON st_overlaps(a.geometry, b.geometry)
                                                                 ) AS matches
                                                             INNER JOIN liane liane_a ON liane_a.way_points = a
                                                             INNER JOIN liane liane_b ON liane_b.way_points = b
                                                             WHERE ratio > 0.3
                                                             ORDER BY ratio DESC;
                                                         """);
  }

  public async Task<Liane> Create(LianeQuery query)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var id = Uuid7.Guid();

    await connection.InsertMultipleAsync(query.TimeConstraints.Select(c => new TimeConstraintDb(id, c.When.Start, c.When.End, c.At, c.WeekDays)), tx);

    var wayPoints = query.WayPoints.Distinct().ToImmutableList();
    if (wayPoints.Count <= 1)
    {
      throw new ArgumentException("At least 2 waypoints are required");
    }

    var wayPointsArray = query.WayPoints.Deref();
    var coordinates = (await query.WayPoints.SelectAsync(w => rallyingPointService.Get(w)))
      .Select(w => w.Location);
    var route = await routingService.GetRoute(coordinates);
    await connection.InsertAsync(new RouteDb(wayPointsArray, route.Coordinates.ToLineString()), tx);

    var lianeDb = new LianeDb(id, query.Name, wayPointsArray, query.RoundTrip, query.CanDrive, query.WeekDays, query.VacationStart, query.VacationEnd, userId, DateTime.UtcNow);
    await connection.InsertAsync(lianeDb, tx);

    tx.Commit();
    return new Liane(id.ToString(), lianeDb.Name, query.WayPoints, lianeDb.RoundTrip, lianeDb.CanDrive, lianeDb.WeekDays, query.TimeConstraints, lianeDb.VacationStart, lianeDb.VacationEnd,
      ImmutableList<Match>.Empty, lianeDb.CreatedBy, lianeDb.CreatedAt);
  }
}

public sealed record TimeConstraint(TimeRange When, Ref<RallyingPoint> At, DayOfTheWeekFlag WeekDays);

public readonly record struct TimeRange(TimeOnly Start, TimeOnly? End);

public sealed record LianeQuery(
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfTheWeekFlag WeekDays,
  ImmutableList<TimeConstraint> TimeConstraints,
  DateTime? VacationStart,
  DateTime? VacationEnd
);

public sealed record LianeDb(
  Guid Id,
  string Name,
  string[] WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfTheWeekFlag WeekDays,
  DateTime? VacationStart,
  DateTime? VacationEnd,
  Ref<Api.User.User> CreatedBy,
  DateTime CreatedAt
);

public sealed record TimeConstraintDb(
  Guid LianeId,
  TimeOnly Start,
  TimeOnly? End,
  string At,
  DayOfTheWeekFlag WeekDays
);

public sealed record RouteDb(
  string[] WayPoints,
  LineString Geometry
);

public sealed record Liane(
  string Id,
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfTheWeekFlag WeekDays,
  ImmutableList<TimeConstraint> TimeConstraints,
  DateTime? VacationStart,
  DateTime? VacationEnd,
  ImmutableList<Match> Matches,
  Ref<Api.User.User> CreatedBy,
  DateTime? CreatedAt
) : IEntity;

public sealed record Match(
  Ref<Liane> Liane,
  Ref<Api.User.User> User,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  Ref<RallyingPoint> Pickup,
  Ref<RallyingPoint> Deposit,
  float Score
);

public sealed record MatchDb(
  Guid From,
  Guid Liane,
  string User,
  string[] WayPoints,
  LatLng Pickup,
  LatLng Deposit,
  float Score
);