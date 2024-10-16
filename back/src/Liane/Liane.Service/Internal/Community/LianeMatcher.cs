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

public sealed class LianeMatcher(IRallyingPointService rallyingPointService, ICurrentContext currentContext)
{
  public async Task<Match?> FindMatchBetween(IDbConnection connection, Guid from, Guid to, IDbTransaction? tx = null)
  {
    var rawMatches = await FindRawMatch(connection, from, to, tx);
    if (rawMatches.IsEmpty)
    {
      return null;
    }

    var snapedPoints = await rallyingPointService.Snap(rawMatches.FilterSelectMany<LianeRawMatch, LatLng>(r => [r.Deposit, r.Pickup, r.DepositReverse, r.PickupReverse]).ToImmutableHashSet());
    return await ToMatch(rawMatches, snapedPoints, ImmutableDictionary<Guid, DateTime>.Empty);
  }

  public async Task<ImmutableList<Match>> FindMatchesBetween(IDbConnection connection, Guid from, IEnumerable<Guid> to, IDbTransaction? tx = null)
  {
    var rawMatches = await FindRawMatch(connection, from, to, tx);
    var snapedPoints = await rallyingPointService.Snap(rawMatches.FilterSelectMany<LianeRawMatch, LatLng>(r => [r.Deposit, r.Pickup, r.DepositReverse, r.PickupReverse]).ToImmutableHashSet());
    return await MapToMatches(snapedPoints, ImmutableDictionary<Guid, DateTime>.Empty, rawMatches);
  }

  public async Task<ImmutableDictionary<Guid, ImmutableList<Match>>> FindMatches(IDbConnection connection, IEnumerable<Guid> linkedTo, IDbTransaction? tx = null)
  {
    var userId = currentContext.CurrentUser().Id;
    var rawMatches = await FindRawMatches(connection, userId, linkedTo, tx: tx);
    var askToJoins = (await connection.QueryAsync<(Guid, DateTime)>(
        """
        SELECT liane_id, requested_at
        FROM liane_request
                 INNER JOIN liane_member ON liane_request.id = liane_member.liane_id
        WHERE liane_request.created_by = @userId AND liane_member.joined_at IS NULL
        """,
        new { userId }, tx)
      ).ToImmutableDictionary(m => m.Item1, m => m.Item2);
    var snapedPoints = await rallyingPointService.Snap(rawMatches.FilterSelectMany<LianeRawMatch, LatLng>(r => [r.Deposit, r.Pickup, r.DepositReverse, r.PickupReverse]).ToImmutableHashSet());
    return await rawMatches
      .GroupByAsync(m => m.From, g => MapToMatches(snapedPoints, askToJoins, g));
  }

  private async Task<ImmutableList<Match>> MapToMatches(ImmutableDictionary<LatLng, RallyingPoint> snapedPoints, ImmutableDictionary<Guid, DateTime> askToJoins, IEnumerable<LianeRawMatch> rawMatches)
  {
    var matches = await rawMatches.GroupBy(m => m.LinkedTo ?? m.LianeRequest)
      .FilterSelectAsync(r => ToMatch(r.ToImmutableList(), snapedPoints, askToJoins));
    return matches
      .OrderByDescending(m => m.Score)
      .ThenByDescending(m => m is Match.Group group ? group.TotalMembers : 0)
      .ThenByDescending(m => m is Match.Single { AskToJoinAt: not null })
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
                                                                   arrive_before,
                                                                   return_after,
                                                                   (SELECT count(*) FROM liane_member c WHERE c.liane_id = linked_to_b) AS total_members,
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
                                                                         lr_b.arrive_before AS arrive_before,
                                                                         lr_b.return_after AS return_after,
                                                                         
                                                                         matching_weekdays(lr_a.week_days, lr_b.week_days) AS week_days,
                                                                         
                                                                         lm_b.liane_id AS linked_to_b,
                                                                         
                                                                         st_linemerge(st_intersection(a.geometry, b.geometry)) intersection,
                                                                         st_linemerge(st_intersection(a_reverse.geometry, b.geometry)) intersection_reverse,
                                                                         st_length(a.geometry) AS                              a_length,
                                                                         st_length(a_reverse.geometry) AS                      a_length_reverse
                                                                  FROM liane_request lr_a
                                                                          LEFT JOIN liane_member lm_a ON
                                                                            lr_a.id = lm_a.liane_request_id
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
                                                                  WHERE ((@from IS NULL AND lr_a.created_by = @userId) OR lr_a.id = @from) AND lm_a.liane_request_id IS NULL
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
                                                                   arrive_before,
                                                                   return_after,
                                                                   (SELECT count(*) FROM liane_member c WHERE c.liane_id = linked_to_b) AS total_members,
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
                                                                         lr_b.arrive_before AS arrive_before,
                                                                         lr_b.return_after AS return_after,
                                                                         
                                                                         matching_weekdays(lr_a.week_days, lr_b.week_days) AS week_days,
                                                                         
                                                                         lm_b.liane_id AS linked_to_b,
                                                                         
                                                                         st_linemerge(st_intersection(a.geometry, b.geometry)) intersection,
                                                                         st_linemerge(st_intersection(a_reverse.geometry, b.geometry)) intersection_reverse,
                                                                         st_length(a.geometry) AS                              a_length,
                                                                         st_length(a_reverse.geometry) AS                      a_length_reverse
                                                                  FROM liane_request lr_a
                                                                          LEFT JOIN liane_member lm_a ON
                                                                            lr_a.id = lm_a.liane_request_id
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

  private async Task<Match?> ToMatch(
    ImmutableList<LianeRawMatch> rawMatches,
    ImmutableDictionary<LatLng, RallyingPoint> snapedPoints,
    ImmutableDictionary<Guid, DateTime> askToJoins
  )
  {
    if (rawMatches.IsEmpty)
    {
      return null;
    }

    var matchingPoints = rawMatches.Select(m => GetBestMatch(m, snapedPoints))
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
      var askToJoinAt = askToJoins.TryGetValue(first.From, out var value) ? value : (DateTime?)null;

      return new Match.Single(
        first.LianeRequest,
        weekDays,
        when,
        pickup,
        deposit,
        matchingPoints.Value.Score,
        matchingPoints.Value.Reverse,
        askToJoinAt
      );
    }

    {
      var first = rawMatches.First();
      var liane = (Ref<Api.Community.Liane>)first.LinkedTo ?? first.LianeRequest;

      var matches = rawMatches.Select(m => (Ref<LianeRequest>)m.LianeRequest).ToImmutableList();

      return new Match.Group(
        liane,
        first.TotalMembers,
        matches,
        weekDays,
        when,
        await matchingPoints.Value.Pickup.Resolve(rallyingPointService.Get),
        await matchingPoints.Value.Deposit.Resolve(rallyingPointService.Get),
        matchingPoints.Value.Score,
        matchingPoints.Value.Reverse
      );
    }
  }

  private (Ref<RallyingPoint> Pickup, Ref<RallyingPoint> Deposit, float Score, bool Reverse)? GetBestMatch(LianeRawMatch match, ImmutableDictionary<LatLng, RallyingPoint> snapedPoints)
  {
    var pickup = match.Pickup.GetOrDefault(snapedPoints.GetValueOrDefault);
    var deposit = match.Deposit.GetOrDefault(snapedPoints.GetValueOrDefault);
    var pickupReverse = match.PickupReverse.GetOrDefault(snapedPoints.GetValueOrDefault);
    var depositReverse = match.DepositReverse.GetOrDefault(snapedPoints.GetValueOrDefault);

    if (pickup is null || deposit is null)
    {
      if (pickupReverse is null || depositReverse is null)
      {
        return null;
      }

      return (pickupReverse, depositReverse, match.ScoreReverse, true);
    }

    return (pickup, deposit, match.Score, false);
  }
}

internal sealed record LianeRawMatch(
  Guid From,
  Guid LianeRequest,
  TimeOnly ArriveBefore,
  TimeOnly ReturnAfter,
  int TotalMembers,
  DayOfWeekFlag WeekDays,
  float Score,
  LatLng? Pickup,
  LatLng? Deposit,
  float ScoreReverse,
  LatLng? PickupReverse,
  LatLng? DepositReverse,
  Guid? LinkedTo
);