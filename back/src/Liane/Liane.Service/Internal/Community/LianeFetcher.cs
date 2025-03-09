using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util.Sql;

namespace Liane.Service.Internal.Community;

public sealed class LianeFetcher(LianeRequestFetcher lianeRequestFetcher, IUserService userService, PostgisDatabase db, IRallyingPointService rallyingPointService)
{
  public async Task<Api.Community.Liane> Get(Guid lianeRequestId)
  {
    using var connection = db.NewConnection();
    return await FetchLiane(connection, lianeRequestId);
  }

  public async Task<ImmutableDictionary<Guid, Api.Community.Liane>> List(IEnumerable<Guid> lianeRequestIds)
  {
    using var connection = db.NewConnection();
    return await FetchLianes(connection, lianeRequestIds);
  }

  public async Task<Api.Community.Liane?> TryFetchLiane(IDbConnection connection, Guid lianeId, IDbTransaction? tx = null)
  {
    return (await FetchLianes(connection, ImmutableList.Create(lianeId), tx)).GetValueOrDefault(lianeId);
  }

  public async Task<Api.Community.Liane> FetchLiane(IDbConnection connection, Guid lianeId, IDbTransaction? tx = null)
  {
    var liane = await TryFetchLiane(connection, lianeId, tx);
    if (liane is null)
    {
      throw new ResourceNotFoundException($"Liane {liane} not found");
    }

    return liane;
  }

  public async Task<ImmutableDictionary<Guid, Api.Community.Liane>> FetchLianes(IDbConnection connection, IEnumerable<Guid> lianeFilter, IDbTransaction? tx = null)
  {
    var lianeMemberDbs = (await connection.QueryAsync(
        Query.Select<LianeMemberDb>().Where(Filter<LianeMemberDb>.Where(l => l.LianeId, ComparisonOperator.In, lianeFilter))
          .OrderBy(m => m.JoinedAt)
          .OrderBy(m => m.RequestedAt),
        tx
      )).GroupBy(m => m.LianeId)
      .ToImmutableDictionary(g => g.Key, g => g.ToImmutableList());

    var lianeRequests = (await lianeRequestFetcher.FetchLianeRequests(connection, lianeMemberDbs.Values.SelectMany(g => g.Select(m => m.LianeRequestId)).Distinct(), tx))
      .ToImmutableDictionary(r => r.Id!.Value);

    return (await lianeMemberDbs
        .OrderBy(e => e.Key)
        .FilterSelectAsync(async e =>
        {
          var g = e.Value;
          var (pendingMembers, members) = g.Split(l => l.JoinedAt == null);
          var lianeMembers = (await members
              .FilterSelectAsync(m => ToLianeMember(lianeRequests, m, m.JoinedAt!.Value)))
            .OrderBy(m => m.JoinedAt)
            .ToImmutableList();
          var lianePendingMembers = (await pendingMembers
              .FilterSelectAsync(m => ToLianeMember(lianeRequests, m, m.RequestedAt)))
            .OrderBy(m => m.JoinedAt)
            .ToImmutableList();

          if (lianeMembers.IsEmpty)
          {
            return null;
          }

          var first = lianeMembers.First().LianeRequest.Value!;

          return new Api.Community.Liane(
            e.Key,
            lianeMembers,
            lianePendingMembers,
            await first.WayPoints.SelectAsync(rallyingPointService.Get),
            first.RoundTrip,
            first.ArriveBefore,
            first.ReturnAfter,
            first.WeekDays,
            false
          );
        }))
      .ToImmutableDictionary(l => l.Id);
  }

  private async Task<LianeMember?> ToLianeMember(ImmutableDictionary<Guid, LianeRequest> lianeRequests, LianeMemberDb m, DateTime joinedAt)
  {
    var memberRequest = lianeRequests.GetValueOrDefault(m.LianeRequestId);
    if (memberRequest is null)
    {
      return null;
    }

    var user = await userService.Get(memberRequest.CreatedBy!);
    return new LianeMember(user, memberRequest, joinedAt, m.LastReadAt);
  }
}