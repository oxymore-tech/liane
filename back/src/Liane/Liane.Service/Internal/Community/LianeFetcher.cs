using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Util.Sql;

namespace Liane.Service.Internal.Community;

public sealed class LianeFetcher(LianeRequestFetcher lianeRequestFetcher, IUserService userService)
{
  public async Task<Api.Community.Liane> FetchLiane(IDbConnection connection, Guid lianeId, IDbTransaction? tx = null)
  {
    var liane = (await FetchLianes(connection, ImmutableList.Create(lianeId), tx)).GetValueOrDefault(lianeId);
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

    var lianeRequests = (await lianeRequestFetcher.FetchLianeRequests(connection, lianeFilter, tx))
      .ToImmutableDictionary(r => r.Id!.Value);

    return (await lianeRequests
        .Values
        .OrderBy(r => r.Id)
        .FilterSelectAsync(async lianeRequest =>
        {
          var lianeRequestId = lianeRequest.Id!.Value;
          var g = lianeMemberDbs.GetValueOrDefault(lianeRequestId, ImmutableList<LianeMemberDb>.Empty);

          var (pendingMembers, members) = g.Split(l => l.JoinedAt == null);
          var lianeMembers = await members
            .FilterSelectAsync(m => ToLianeMember(lianeRequests, m, m.JoinedAt!.Value));
          var lianePendingMembers = await pendingMembers
            .FilterSelectAsync(m => ToLianeMember(lianeRequests, m, m.RequestedAt));
          return new Api.Community.Liane(
            lianeRequestId,
            lianeMembers.ToImmutableList(),
            lianePendingMembers.ToImmutableList()
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

    var user = await userService.GetFullUser(memberRequest.CreatedBy!);
    return new LianeMember(user, memberRequest, joinedAt, m.LastReadAt);
  }
}