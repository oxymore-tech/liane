using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Community;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using MoreLinq.Extensions;
using LianeRequest = Liane.Api.Community.LianeRequest;
using Match = Liane.Api.Community.Match;

namespace Liane.Service.Internal.Community;

public sealed class LianeMatcher(IRallyingPointService rallyingPointService, ICurrentContext currentContext, LianeFetcher lianeFetcher)
{
  public async Task<Match?> FindMatchBetween(IDbConnection connection, Guid from, Guid to, IDbTransaction? tx = null)
  {
    var rawMatches = await FindRawMatch(connection, from, to, tx);
    if (rawMatches.IsEmpty)
    {
      return null;
    }

    var userId = currentContext.CurrentUser().Id;
    var mapParams = await GetMapParams(connection, rawMatches, userId, tx);
    return (await MapToMatches(rawMatches, mapParams)).FirstOrDefault();
  }

  public async Task<ImmutableList<Match>> FindMatchesBetween(IDbConnection connection, Guid from, IEnumerable<Guid> to, IDbTransaction? tx = null)
  {
    var rawMatches = await FindRawMatch(connection, from, to, tx);
    var userId = currentContext.CurrentUser().Id;
    var mapParams = await GetMapParams(connection, rawMatches, userId, tx);
    return await MapToMatches(rawMatches, mapParams);
  }

  public async Task<ImmutableDictionary<Guid, ImmutableList<Match>>> FindMatches(IDbConnection connection, IEnumerable<Guid> linkedTo, IDbTransaction? tx = null)
  {
    var userId = currentContext.CurrentUser().Id;
    var rawMatches = await FindRawMatches(connection, userId, linkedTo, tx: tx);
    var mapParams = await GetMapParams(connection, rawMatches, userId, tx);
    return await rawMatches
      .GroupByAsync(m => m.From, g => MapToMatches(g, mapParams));
  }

  private async Task<ImmutableList<Match>> MapToMatches(IEnumerable<LianeRawMatch> rawMatches, MapParams mapParams)
  {
    var matches = await rawMatches.GroupBy(m => m.LinkedTo ?? m.LianeRequest)
      .FilterSelectAsync(r => ToMatch(r.ToImmutableList(), mapParams));
    return matches
      .OrderByDescending(m => m.Score)
      .ThenByDescending(m => m is Match.Group group ? group.Matches.Count : 1)
      .ThenByDescending(m => m.Members.Count)
      .ThenBy(m => m.Liane.IdAsGuid())
      .ToImmutableList();
  }

  /// <summary>
  /// Récupère toutes les lianes request en base qui matchent 2 à 2.<br/>
  /// Pour que 2 liane_request matchent :
  /// <ul>
  ///   <li>il faut que leurs trajets se croisent.</li>
  ///   <li>avec une intersection dont la longueur est au moins égale à 35% du trajet demandé.</li>
  ///   <li>que si elle appartienne déjà une liane, ce soit la même.</li>
  /// </ul> 
  /// </summary>
  private static async Task<ImmutableList<LianeRawMatch>> FindRawMatches(IDbConnection connection, string userId, IEnumerable<Guid> linkedTo, Guid? from = null, Guid? to = null,
    IDbTransaction? tx = null)
  {
    var result = await connection.QueryAsync<LianeRawMatch>("""
                                                            SELECT "from",
                                                                   liane_request,
                                                                   name,
                                                                   arrive_before,
                                                                   return_after,
                                                                   week_days,
                                                                   
                                                                   st_length(intersection) / a_length AS score,
                                                                   st_startpoint(intersection) AS pickup,
                                                                   st_endpoint(intersection) AS deposit,
                                                                   
                                                                   st_length(intersection_reverse) / a_length_reverse AS score_reverse,
                                                                   st_startpoint(intersection_reverse) AS pickup_reverse,
                                                                   st_endpoint(intersection_reverse) AS deposit_reverse,
                                                                   
                                                                   linked_to_b AS linked_to
                                                            FROM (SELECT lr_a.id AS "from",
                                                                         lr_b.id AS liane_request,
                                                                         lr_b.name AS name,
                                                                         lr_b.arrive_before AS arrive_before,
                                                                         lr_b.return_after AS return_after,
                                                                         
                                                                         matching_weekdays(lr_a.week_days, lr_b.week_days) AS week_days,
                                                                         
                                                                         lm_b.liane_id AS linked_to_b,
                                                                         
                                                                         st_linemerge(st_intersection(a.geometry, b.geometry)) intersection,
                                                                         st_linemerge(st_intersection(a_reverse.geometry, b.geometry)) intersection_reverse,
                                                                         st_length(a.geometry) AS                              a_length,
                                                                         st_length(a_reverse.geometry) AS                      a_length_reverse
                                                                  FROM liane_request lr_a
                                                                          INNER JOIN route a ON
                                                                            a.way_points = lr_a.way_points
                                                                          LEFT JOIN route a_reverse ON
                                                                            lr_a.round_trip AND a_reverse.way_points = array_reverse(lr_a.way_points)
                                                                          INNER JOIN liane_request lr_b ON
                                                                            lr_b.id != lr_a.id
                                                                              AND ((@to IS NULL AND lr_b.is_enabled) OR lr_b.id = @to)
                                                                              AND NOT lr_b.id = ANY(@linkedTo)
                                                                              AND lr_b.created_by != lr_a.created_by
                                                                              AND matching_weekdays(lr_a.week_days, lr_b.week_days)::integer != 0
                                                                          LEFT JOIN liane_member lm_b ON
                                                                            lr_b.id = lm_b.liane_request_id AND NOT lm_b.liane_id = ANY(@linkedTo)
                                                                          INNER JOIN route b ON
                                                                            b.way_points = lr_b.way_points AND st_intersects(a.geometry, b.geometry)
                                                                  WHERE ((@from IS NULL AND lr_a.created_by = @userId) OR lr_a.id = @from)
                                                                  ) AS first_glance
                                                            WHERE st_length(intersection) / a_length > 0.35
                                                            ORDER BY st_length(intersection) / a_length DESC, "from"
                                                            """,
      new { userId, linkedTo = linkedTo.ToArray(), from, to },
      tx
    );
    return result.ToImmutableList();
  }

  private static async Task<ImmutableList<LianeRawMatch>> FindRawMatch(IDbConnection connection, Guid from, Guid to, IDbTransaction? tx = null)
    => await FindRawMatch(connection, from, [to], tx);

  private static async Task<ImmutableList<LianeRawMatch>> FindRawMatch(IDbConnection connection, Guid from, IEnumerable<Guid> to, IDbTransaction? tx = null)
  {
    var result = await connection.QueryAsync<LianeRawMatch>("""
                                                            SELECT "from",
                                                                   liane_request,
                                                                   name,
                                                                   arrive_before,
                                                                   return_after,
                                                                   week_days,
                                                                   
                                                                   st_length(intersection) / a_length AS score,
                                                                   st_startpoint(intersection) AS pickup,
                                                                   st_endpoint(intersection) AS deposit,
                                                                   
                                                                   st_length(intersection_reverse) / a_length_reverse AS score_reverse,
                                                                   st_startpoint(intersection_reverse) AS pickup_reverse,
                                                                   st_endpoint(intersection_reverse) AS deposit_reverse,
                                                                   
                                                                   linked_to_b AS linked_to
                                                            FROM (SELECT lr_a.id AS "from",
                                                                         lr_b.id AS liane_request,
                                                                         lr_b.name AS name,
                                                                         lr_b.arrive_before AS arrive_before,
                                                                         lr_b.return_after AS return_after,
                                                                         
                                                                         matching_weekdays(lr_a.week_days, lr_b.week_days) AS week_days,
                                                                         
                                                                         lm_b.liane_id AS linked_to_b,
                                                                         
                                                                         st_linemerge(st_intersection(a.geometry, b.geometry)) intersection,
                                                                         st_linemerge(st_intersection(a_reverse.geometry, b.geometry)) intersection_reverse,
                                                                         st_length(a.geometry) AS                              a_length,
                                                                         st_length(a_reverse.geometry) AS                      a_length_reverse
                                                                  FROM liane_request lr_a
                                                                          INNER JOIN route a ON
                                                                            a.way_points = lr_a.way_points
                                                                          LEFT JOIN route a_reverse ON
                                                                            lr_a.round_trip AND a_reverse.way_points = array_reverse(lr_a.way_points)
                                                                          INNER JOIN liane_request lr_b ON
                                                                            lr_b.id != lr_a.id
                                                                              AND lr_b.id = ANY(@to)
                                                                              AND lr_b.created_by != lr_a.created_by
                                                                              AND matching_weekdays(lr_a.week_days, lr_b.week_days)::integer != 0
                                                                          LEFT JOIN liane_member lm_b ON
                                                                            lr_b.id = lm_b.liane_request_id
                                                                          INNER JOIN route b ON
                                                                            b.way_points = lr_b.way_points
                                                                  WHERE lr_a.id = @from
                                                                  ) AS first_glance
                                                            """,
      new { from, to },
      tx
    );
    return result.ToImmutableList();
  }

  private async Task<Match?> ToMatch(ImmutableList<LianeRawMatch> rawMatches,
    MapParams mapParams)
  {
    if (rawMatches.IsEmpty)
    {
      return null;
    }

    var matchingPoints = rawMatches.Select(m => GetBestMatch(m, mapParams.SnapedPoints))
      .Where(m => m is not null)
      .OrderByDescending(m => m!.Value.Score)
      .FirstOrDefault();
    if (matchingPoints is null)
    {
      return null;
    }

    var pickup = await matchingPoints.Value.Pickup.Resolve(rallyingPointService.Get);
    var deposit = await matchingPoints.Value.Deposit.Resolve(rallyingPointService.Get);

    var weekDays = rawMatches.Select(m => m.WeekDays)
      .AggregateRight((a, b) => a | b);

    var when = rawMatches.Select(m => new TimeRange(m.ArriveBefore, m.ReturnAfter))
      .AggregateRight((a, b) => a.Merge(b));

    if (rawMatches.Count == 1)
    {
      var first = rawMatches.First();
      JoinRequest? joinRequest = mapParams.PendingJoinRequests.TryGetValue(first.From, out var d)
        ? new JoinRequest.Pending(d)
        : mapParams.ReceivedJoinRequests.TryGetValue(first.LianeRequest, out var d2)
          ? new JoinRequest.Received(d2)
          : null;
      var liane = mapParams.Lianes.GetValueOrDefault(first.LianeRequest);

      return new Match.Single(
        first.LianeRequest,
        liane is null ? [] : ImmutableList.Create(liane.CreatedBy),
        first.Name,
        weekDays,
        when,
        pickup,
        deposit,
        matchingPoints.Value.Score,
        matchingPoints.Value.Reverse,
        joinRequest
      );
    }

    {
      var first = rawMatches.First();
      var lianeRef = first.LinkedTo ?? first.LianeRequest;
      var liane = mapParams.Lianes.GetValueOrDefault(lianeRef);

      var matches = rawMatches.Select(m => (Ref<LianeRequest>)m.LianeRequest).ToImmutableList();

      return new Match.Group(
        lianeRef,
        liane?.Members.FilterSelect(m => m.User.Value).ToImmutableList() ?? [],
        matches,
        weekDays,
        when,
        await matchingPoints.Value.Pickup.Resolve(rallyingPointService.Get),
        await matchingPoints.Value.Deposit.Resolve(rallyingPointService.Get),
        matchingPoints.Value.Score,
        matchingPoints.Value.Reverse,
        mapParams.PendingJoinRequests.TryGetValue(first.From, out var d) ? d : null
      );
    }
  }

  private static (Ref<RallyingPoint> Pickup, Ref<RallyingPoint> Deposit, float Score, bool Reverse)? GetBestMatch(LianeRawMatch match, ImmutableDictionary<LatLng, RallyingPoint> snapedPoints)
  {
    var pickup = match.Pickup.GetOrDefault(snapedPoints.GetValueOrDefault);
    var deposit = match.Deposit.GetOrDefault(snapedPoints.GetValueOrDefault);
    var pickupReverse = match.PickupReverse.GetOrDefault(snapedPoints.GetValueOrDefault);
    var depositReverse = match.DepositReverse.GetOrDefault(snapedPoints.GetValueOrDefault);

    if (pickup is not null && deposit is not null)
    {
      return (pickup, deposit, match.Score, false);
    }

    if (pickupReverse is null || depositReverse is null)
    {
      return null;
    }

    return (pickupReverse, depositReverse, match.ScoreReverse, true);
  }

  private async Task<MapParams> GetMapParams(IDbConnection connection, ImmutableList<LianeRawMatch> rawMatches, string userId, IDbTransaction? tx = null)
  {
    var lianes = await lianeFetcher.FetchLianes(connection, rawMatches.FilterSelectMany<LianeRawMatch, Guid>(r => [r.LinkedTo, r.LianeRequest]).Distinct(), tx);
    var snapedPoints = await rallyingPointService.Snap(rawMatches.FilterSelectMany<LianeRawMatch, LatLng>(r => [r.Deposit, r.Pickup, r.DepositReverse, r.PickupReverse]).ToImmutableHashSet());
    var pendingJoinRequests = (await connection.QueryAsync<(Guid, DateTime)>(
        """
        SELECT liane_request.id, requested_at
        FROM liane_request
                 INNER JOIN liane_member ON liane_request.id = liane_member.liane_request_id
        WHERE liane_request.created_by = @userId AND liane_member.joined_at IS NULL
        """,
        new { userId }, tx)
      ).ToImmutableDictionary(m => m.Item1, m => m.Item2);
    var receivedJoinRequests = (await connection.QueryAsync<(Guid, DateTime)>(
        """
        SELECT liane_member.liane_request_id, requested_at
        FROM liane_request
                 INNER JOIN liane_member ON liane_request.id = liane_member.liane_id
        WHERE liane_request.created_by = @userId AND liane_member.joined_at IS NULL
        """,
        new { userId }, tx)
      ).ToImmutableDictionary(m => m.Item1, m => m.Item2);
    return new MapParams(snapedPoints, pendingJoinRequests, receivedJoinRequests, lianes);
  }
}

internal sealed record LianeRawMatch(
  Guid From,
  Guid LianeRequest,
  string Name,
  TimeOnly ArriveBefore,
  TimeOnly ReturnAfter,
  DayOfWeekFlag WeekDays,
  float Score,
  LatLng? Pickup,
  LatLng? Deposit,
  float ScoreReverse,
  LatLng? PickupReverse,
  LatLng? DepositReverse,
  Guid? LinkedTo
);

internal sealed record MapParams(
  ImmutableDictionary<LatLng, RallyingPoint> SnapedPoints,
  ImmutableDictionary<Guid, DateTime> PendingJoinRequests,
  ImmutableDictionary<Guid, DateTime> ReceivedJoinRequests,
  ImmutableDictionary<Guid, Api.Community.Liane> Lianes
);