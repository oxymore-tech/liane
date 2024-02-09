using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Sql;

namespace Liane.Service.Internal.Liane;

public sealed class NewLianeServiceImpl
{
  private readonly PostgisDatabase db;
  private readonly ICurrentContext currentContext;

  public NewLianeServiceImpl(PostgisDatabase db, ICurrentContext currentContext)
  {
    this.db = db;
    this.currentContext = currentContext;
  }

  public Task ListLianes()
  {
    return Task.CompletedTask;
  }

  public Task FindMatches()
  {
    return Task.CompletedTask;
  }

  public async Task<Liane2> Create(LianeQuery query)
  {
    using var connection = db.NewConnection();
    var userId = currentContext.CurrentUser().Id;
    var liane = new Liane2(null, query.Name, userId, DateTime.Now, query.Constraints);
    await connection.InsertAsync(liane);
    return liane;
  }
}

[Union]
public abstract record CarPoolingConstraint
{
  public sealed record FromTo(Ref<RallyingPoint> From, Ref<RallyingPoint> To) : CarPoolingConstraint;
}

public sealed record LianeQuery(
  string Name,
  ImmutableList<CarPoolingConstraint> Constraints
);

public sealed record Liane2(
  string? Id,
  string Name,
  Ref<Api.User.User> CreatedBy,
  DateTime? CreatedAt,
  ImmutableList<CarPoolingConstraint> Constraints
) : IEntity;

public sealed record LianeMatch(
  Liane2 Liane,
  ImmutableList<Liane2> Matches
);