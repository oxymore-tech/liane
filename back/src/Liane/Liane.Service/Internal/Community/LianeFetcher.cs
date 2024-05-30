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
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util.Sql;

namespace Liane.Service.Internal.Community;

public sealed class LianeFetcher(LianeRequestFetcher lianeRequestFetcher, IUserService userService)
{
  public async Task<Api.Community.Liane> FetchLiane(IDbConnection connection, Guid lianeId, IDbTransaction? tx = null)
  {
    var liane = (await FetchLianes(connection, ImmutableList.Create(lianeId), tx)).FirstOrDefault();
    if (liane is null)
    {
      throw new ResourceNotFoundException($"Liane {liane} not found");
    }

    return liane;
  }

  public async Task<ImmutableList<Api.Community.Liane>> FetchLianes(IDbConnection connection, IEnumerable<Guid> lianeFilter, IDbTransaction? tx = null)
  {
    var lianeDbs = await connection.QueryAsync(Query.Select<LianeDb>().Where(Filter<LianeDb>.Where(l => l.Id, ComparisonOperator.In, lianeFilter)), tx);
    var memberDbs = (await connection.QueryAsync(Query.Select<LianeMemberDb>().Where(Filter<LianeMemberDb>.Where(m => m.LianeId, ComparisonOperator.In, lianeFilter)), tx))
      .GroupBy(lm => lm.LianeId)
      .ToImmutableDictionary(g => g.Key, g => g.ToImmutableList());
    var lianeRequestFilter = memberDbs.Values.SelectMany(l => l.Select(m => m.LianeRequestId)).ToImmutableList();
    var fetchLianeRequests = (await lianeRequestFetcher.FetchLianeRequests(connection, lianeRequestFilter, tx))
      .ToImmutableDictionary(r => r.Id);
    return await lianeDbs.SelectAsync(async l =>
    {
      var members = memberDbs.GetValueOrDefault(l.Id, ImmutableList<LianeMemberDb>.Empty);
      return new Api.Community.Liane(
        l.Id.ToString(),
        l.Name,
        l.CreatedBy,
        l.CreatedAt,
        await members.SelectAsync(async m =>
        {
          var lianeRequest = fetchLianeRequests.GetValueOrDefault(m.LianeRequestId) ?? (Ref<LianeRequest>)m.LianeRequestId;
          var user = await userService.GetFullUser(m.UserId);
          return new LianeMember(user, lianeRequest, m.JoinedAt, m.LastReadAt);
        })
      );
    });
  }
}