using System;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Dapper;
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

  public NewLianeServiceImpl(PostgisDatabase db, ICurrentContext currentContext, JsonSerializerOptions jsonOptions)
  {
    this.db = db;
    currentContext1 = currentContext;
    SqlMapper.AddTypeHandler(new JsonTypeHandler<CarPoolingConstraint>(jsonOptions));
  }

  public async Task<ImmutableList<Liane>> List()
  {
    var userId = currentContext1.CurrentUser().Id;
    using var connection = db.NewConnection();
    var lianes = await connection.QueryAsync(Query.Select<LianeDb>()
      .Where(Filter<LianeDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId)));
    var constraints = (await connection.QueryAsync(Query.Select<CarPoolingConstraintDb>()
        .Where(Filter<CarPoolingConstraintDb>.Where(r => r.LianeId, ComparisonOperator.In, lianes.Select(l => l.Id)))))
      .GroupBy(c => c.LianeId)
      .ToImmutableDictionary(g => g.Key, g => g.Select(c => c.Content.Value).ToImmutableList());

    return lianes.Select(l => new Liane(
      l.Id.ToString(),
      l.Name,
      l.WayPoints.AsRef<RallyingPoint>(),
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
    await connection.InsertAsync(new LianeDb(id, query.Name, query.WayPoints.Deref(), userId, DateTime.UtcNow), tx);

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
  string[] WayPoints,
  Ref<Api.User.User> CreatedBy,
  DateTime CreatedAt
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