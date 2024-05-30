using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util.Sql;
using LianeRequest = Liane.Api.Community.LianeRequest;

namespace Liane.Service.Internal.Community;

public sealed class LianeRequestFetcher(IRallyingPointService rallyingPointService)
{
  public async Task<LianeRequest> FetchLianeRequest(IDbConnection connection, Guid lianeRequestId, IDbTransaction? tx = null)
  {
    var lianeRequest = (await FetchLianeRequests(connection, ImmutableList.Create(lianeRequestId), tx)).FirstOrDefault();
    if (lianeRequest is null)
    {
      throw new ResourceNotFoundException($"Liane request '{lianeRequestId}' not found");
    }

    return lianeRequest;
  }

  public async Task<ImmutableList<LianeRequest>> FetchLianeRequests(IDbConnection connection, IEnumerable<Guid> lianeRequestFilter, IDbTransaction? tx = null) =>
    await FetchLianeRequests(connection, Filter<LianeRequestDb>.Where(r => r.Id, ComparisonOperator.In, lianeRequestFilter), tx);

  public async Task<ImmutableList<LianeRequest>> FetchLianeRequests(IDbConnection connection, Filter<LianeRequestDb> lianeRequestFilter, IDbTransaction? tx = null)
  {
    var lianeRequestDbs = await connection.QueryAsync(Query.Select<LianeRequestDb>()
      .Where(lianeRequestFilter)
      .OrderBy(r => r.Id));

    var lianeRequestsId = lianeRequestDbs.Select(l => l.Id);
    var constraints = (await connection.QueryAsync(Query.Select<TimeConstraintDb>()
        .Where(Filter<TimeConstraintDb>.Where(r => r.LianeRequestId, ComparisonOperator.In, lianeRequestsId))))
      .GroupBy(c => c.LianeRequestId)
      .ToImmutableDictionary(g => g.Key, g => g.Select(c => new TimeConstraint(new TimeRange(c.Start, c.End), c.At, c.WeekDays)).ToImmutableList());

    return await lianeRequestDbs.SelectAsync(async l => new LianeRequest(
      l.Id,
      l.Name,
      await l.WayPoints.AsRef<RallyingPoint>(rallyingPointService.Get),
      l.RoundTrip,
      l.CanDrive,
      l.WeekDays,
      constraints.GetValueOrDefault(l.Id, ImmutableList<TimeConstraint>.Empty),
      l.IsEnabled,
      l.CreatedBy,
      l.CreatedAt
    ));
  }
}