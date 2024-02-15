using System;
using System.Collections.Immutable;
using System.ComponentModel.DataAnnotations.Schema;
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

public sealed class NewLianeServiceImpl
{
  private readonly PostgisDatabase db;
  private readonly ICurrentContext currentContext1;
  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;

  public NewLianeServiceImpl(PostgisDatabase db, ICurrentContext currentContext, JsonSerializerOptions jsonOptions, IRoutingService routingService, IRallyingPointService rallyingPointService)
  {
    this.db = db;
    currentContext1 = currentContext;
    this.routingService = routingService;
    this.rallyingPointService = rallyingPointService;
    SqlMapper.AddTypeHandler(new JsonTypeHandler<CarPoolingConstraint>(jsonOptions));
  }

  public async Task<ImmutableList<Liane>> List()
  {
    var userId = currentContext1.CurrentUser().Id;
    using var connection = db.NewConnection();
    var lianes = await connection.QueryAsync(Query.Select<LianeDb>()
      .Where(Filter<LianeDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId)));
    var lianeIds = lianes.Select(l => l.Id).ToArray();
    var constraints = (await connection.QueryAsync(Query.Select<CarPoolingConstraintDb>()
        .Where(Filter<CarPoolingConstraintDb>.Where(r => r.LianeId, ComparisonOperator.In, lianeIds))))
      .GroupBy(c => c.LianeId)
      .ToImmutableDictionary(g => g.Key, g => g.Select(c => c.Content.Value).ToImmutableList());
    var routeIds = lianes.Select(l => l.RouteId).ToArray();
    var routes = (await connection.QueryAsync(Query.Select<RouteDb>()
        .Where(Filter<RouteDb>.Where(r => r.Id, ComparisonOperator.In, routeIds))))
      .ToImmutableDictionary(g => g.Id, g => g.WayPoints.AsRef<RallyingPoint>());
    return lianes.Select(l => new Liane(
      l.Id.ToString(),
      l.Name,
      routes.GetValueOrDefault(l.RouteId, ImmutableList<Ref<RallyingPoint>>.Empty),
      l.CreatedBy,
      l.CreatedAt,
      constraints.GetValueOrDefault(l.Id, ImmutableList<CarPoolingConstraint>.Empty),
      ImmutableList<Liane>.Empty
    )).ToImmutableList();
  }

  public Task FindMatches()
  {
    using var connection = db.NewConnection();
    // TODO
    // Prendre toutes les lianes en base
    // Pour chaque liane, resoudre la geometry du trajet en fonction des waypoints
    // Regrouper ces lianes par clusters des geometries qui sintersect
    // Pour chaque cluster, faire des sous ensembles de lianes qui ont des contraintes compatibles
    return Task.CompletedTask;
  }

  public async Task<Liane> Create(LianeQuery query)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext1.CurrentUser().Id;
    var id = Uuid7.Guid();

    await connection.InsertMultipleAsync(query.Constraints.Select(c => new CarPoolingConstraintDb(id, c)), tx);

    var wayPoints = await query.WayPoints.SelectAsync(w => rallyingPointService.Get(w));

    var coordinates = wayPoints.Select(w => w.Location);

    var route = await routingService.GetRoute(coordinates);

    var routeId = Uuid7.Guid();
    await connection.InsertAsync(new RouteWithGeometryDb(routeId, query.WayPoints.Deref(), route.Coordinates.ToLineString()), tx);
    await connection.InsertAsync(new LianeDb(id, query.Name, routeId, userId, DateTime.UtcNow), tx);

    var liane = new Liane(id.ToString(), query.Name, query.WayPoints, userId, DateTime.UtcNow, query.Constraints, ImmutableList<Liane>.Empty);

    tx.Commit();
    return liane;
  }
}

[Union]
public abstract record CarPoolingConstraint
{
  private CarPoolingConstraint()
  {
  }

  public sealed record NoReturns : CarPoolingConstraint;

  public sealed record NoWeekend : CarPoolingConstraint;

  public sealed record NoWeekday(int WeekDay) : CarPoolingConstraint;

  public sealed record DepartureBetween(TimeOnly Start, TimeOnly End) : CarPoolingConstraint;

  public sealed record ArrivalBetween(TimeOnly Start, TimeOnly End) : CarPoolingConstraint;

  public sealed record RendezVous(TimeOnly At, Ref<RallyingPoint> WayPoint) : CarPoolingConstraint;

  public sealed record CannotDrive : CarPoolingConstraint;
}

public sealed record LianeQuery(
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  ImmutableList<CarPoolingConstraint> Constraints
);

internal sealed record CarPoolingConstraintDb(
  Guid LianeId,
  Json<CarPoolingConstraint> Content
);

public sealed record LianeDb(
  Guid Id,
  string Name,
  Guid RouteId,
  Ref<Api.User.User> CreatedBy,
  DateTime CreatedAt
);

[Table("route")]
public sealed record RouteWithGeometryDb(
  Guid Id,
  string[] WayPoints,
  LineString Geometry
);

public sealed record RouteDb(
  Guid Id,
  string[] WayPoints
);

public sealed record Liane(
  string Id,
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  Ref<Api.User.User> CreatedBy,
  DateTime? CreatedAt,
  ImmutableList<CarPoolingConstraint> Constraints,
  ImmutableList<Liane> Matches
) : IEntity;