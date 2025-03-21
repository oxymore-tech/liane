using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
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
  public async Task<Api.Community.Liane?> TryGet(Guid lianeRequestId)
  {
    using var connection = db.NewConnection();
    return await TryFetchLiane(connection, lianeRequestId);
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
      throw new ResourceNotFoundException($"Liane '{lianeId}' not found");
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

    var requestLength = (await connection.QueryAsync<(Guid, double)>("""
                                                                     SELECT lr.id, st_length(r.geometry) as length
                                                                     FROM liane_request lr
                                                                     INNER JOIN route r ON r.way_points = lr.way_points
                                                                     WHERE lr.id = ANY(@lianeRequestIds)
                                                                     """, new { lianeRequestIds = lianeRequests.Keys.ToArray() }, tx))
      .ToImmutableDictionary(i => i.Item1, i => i.Item2);

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

          var agg = AggregateLianeRequest(lianeMembers, requestLength);

          return new Api.Community.Liane(
            e.Key,
            lianeMembers,
            lianePendingMembers,
            await agg.Longuest.WayPoints.SelectAsync(rallyingPointService.Get),
            agg.RoundTrip,
            agg.ArriveBefore.Start,
            agg.ReturnAfter.Start,
            agg.ArriveBefore.End,
            agg.ReturnAfter.End,
            agg.WeekDays,
            false
          );
        }))
      .ToImmutableDictionary(l => l.Id);
  }

  private static AggregatedLianeRequest AggregateLianeRequest(ImmutableList<LianeMember> lianeMembers, ImmutableDictionary<Guid, double> requestLength)
  {
    LianeRequest? longuest = null;

    double length = 0;
    var weekDays = DayOfWeekFlag.Empty;
    var arriveBeforeMin = TimeOnly.MaxValue;
    var arriveBeforeMax = TimeOnly.MinValue;
    var returnAfterMin = TimeOnly.MaxValue;
    var returnAfterMax = TimeOnly.MinValue;
    var roundTrip = false;
    
    foreach (var lianeRequest in lianeMembers.Select(l => l.LianeRequest.Value!))
    {
      var currentLength = requestLength.GetValueOrDefault(lianeRequest.Id!.Value);
      if (length < currentLength)
      {
        length = currentLength;
        longuest = lianeRequest;
      }
      weekDays |= lianeRequest.WeekDays;
      
      if (arriveBeforeMin > lianeRequest.ArriveBefore)
      {
        arriveBeforeMin = lianeRequest.ArriveBefore;
      }
      if (arriveBeforeMax < lianeRequest.ArriveBefore)
      {
        arriveBeforeMax = lianeRequest.ArriveBefore;
      }
      if (returnAfterMin > lianeRequest.ReturnAfter)
      {
        returnAfterMin = lianeRequest.ReturnAfter;
      }
      if (returnAfterMax < lianeRequest.ReturnAfter)
      {
        returnAfterMax = lianeRequest.ReturnAfter;
      }
      if (lianeRequest.RoundTrip)
      {
        roundTrip = true;
      }
    }
    return new AggregatedLianeRequest(longuest!,
      new TimeRange(arriveBeforeMin, arriveBeforeMax),
      new TimeRange(returnAfterMin, returnAfterMax),
      weekDays,
      roundTrip
    );
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

internal sealed record AggregatedLianeRequest( 
  LianeRequest Longuest,
  TimeRange ArriveBefore,
  TimeRange ReturnAfter,
  DayOfWeekFlag WeekDays,
  bool RoundTrip
);