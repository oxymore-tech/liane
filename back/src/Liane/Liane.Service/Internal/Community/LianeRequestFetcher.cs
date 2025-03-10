using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util.Sql;
using LianeRequest = Liane.Api.Community.LianeRequest;

namespace Liane.Service.Internal.Community;

public sealed class LianeRequestFetcher(IRallyingPointService rallyingPointService, PostgisDatabase db)
{
  public async Task<LianeRequest> Get(Guid lianeRequestId)
  {
    using var connection = db.NewConnection();
    return await FetchLianeRequest(connection, lianeRequestId);
  }

  public async Task<ImmutableDictionary<Guid, LianeRequest>> List(IEnumerable<Guid> lianeRequestIds)
  {
    using var connection = db.NewConnection();
    return (await FetchLianeRequests(connection, lianeRequestIds))
      .ToImmutableDictionary(l => l.Id!.Value);
  }

  public async Task<LianeRequest> FetchLianeRequest(IDbConnection connection, Guid lianeRequestId, IDbTransaction? tx = null)
  {
    var lianeRequest = await TryFetchLianeRequest(connection, lianeRequestId, tx);
    if (lianeRequest is null)
    {
      throw new ResourceNotFoundException($"Liane request '{lianeRequestId}' not found");
    }

    return lianeRequest;
  }

  public async Task<LianeRequest?> TryFetchLianeRequest(IDbConnection connection, Guid lianeRequestId, IDbTransaction? tx)
  {
    return (await FetchLianeRequests(connection, ImmutableList.Create(lianeRequestId), tx)).FirstOrDefault();
  }

  public async Task<ImmutableList<LianeRequest>> FetchLianeRequests(IDbConnection connection, IEnumerable<Guid> lianeRequestFilter, IDbTransaction? tx = null) =>
    await FetchLianeRequests(connection, Filter<LianeRequestDb>.Where(r => r.Id, ComparisonOperator.In, lianeRequestFilter), tx);

  public async Task<ImmutableList<LianeRequest>> FetchLianeRequests(IDbConnection connection, Filter<LianeRequestDb> lianeRequestFilter, IDbTransaction? tx = null)
  {
    var lianeRequestDbs = await connection.QueryAsync(Query.Select<LianeRequestDb>()
      .Where(lianeRequestFilter)
      .OrderBy(r => r.Id), tx);

    return await lianeRequestDbs.SelectAsync(async l => new LianeRequest(
      l.Id,
      l.Name,
      await l.WayPoints.AsRef<RallyingPoint>(rallyingPointService.Get),
      l.RoundTrip,
      l.ArriveBefore,
      l.ReturnAfter,
      l.CanDrive,
      l.WeekDays,
      l.IsEnabled,
      l.CreatedBy,
      l.CreatedAt
    ));
  }
}