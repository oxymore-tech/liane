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
    var userId = currentContext.CurrentUser().Id;
    var rawMatches = await FindRawMatches(connection, userId, null, from, to, tx);
    if (rawMatches.IsEmpty)
    {
      return null;
    }

    return await ToMatch(rawMatches);
  }

  public async Task<ImmutableDictionary<Guid, ImmutableList<Match>>> FindMatches(IDbConnection connection, IEnumerable<Guid> linkedTo)
  {
    var userId = currentContext.CurrentUser().Id;
    var rawMatches = await FindRawMatches(connection, userId, linkedTo);
    return await rawMatches
      .GroupByAsync(m => m.From, async g =>
      {
        var matches = await g.GroupBy(m => m.LinkedTo ?? m.LianeRequest)
          .FilterSelectAsync(r => ToMatch(r.ToImmutableList()));
        return matches
          .OrderByDescending(m => m.Score)
          .ThenByDescending(m => m.Matches.Count)
          .ThenBy(m => m.Liane.IdAsGuid())
          .ToImmutableList();
      });
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
  private static async Task<ImmutableList<LianeRawMatch>> FindRawMatches(IDbConnection connection, string userId, IEnumerable<Guid>? linkedTo = null, Guid? from = null, Guid? to = null,
    IDbTransaction? tx = null)
  {
    var result = await connection.QueryAsync<LianeRawMatch>("""
                                                            SELECT "from",
                                                                   liane_request,
                                                                   arrive_before,
                                                                   return_after,
                                                                   (SELECT count(*) FROM liane_member c WHERE c.liane_id = linked_to_b) AS total_members,
                                                                   way_points,
                                                                   week_days,
                                                                   
                                                                   st_length(intersection) / a_length AS score,
                                                                   st_startpoint(intersection) AS pickup,
                                                                   st_endpoint(intersection) AS deposit,
                                                                   nearest_rp(st_startpoint(intersection)) AS pickup_point,
                                                                   nearest_rp(st_endpoint(intersection)) AS deposit_point,
                                                                   
                                                                   st_length(intersection_reverse) / a_length_reverse AS score_reverse,
                                                                   st_startpoint(intersection_reverse) AS pickup_reverse,
                                                                   st_endpoint(intersection_reverse) AS deposit_reverse,
                                                                   nearest_rp(st_startpoint(intersection_reverse)) AS pickup_point_reverse,
                                                                   nearest_rp(st_endpoint(intersection_reverse)) AS deposit_point_reverse,
                                                                   
                                                                   linked_to_b AS linked_to
                                                            FROM (SELECT lr_a.id AS "from",
                                                                         lr_b.id AS liane_request,
                                                                         lr_b.arrive_before AS arrive_before,
                                                                         lr_b.return_after AS return_after,
                                                                         
                                                                         lr_b.way_points AS way_points,
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
                                                                              AND (@linkedTo IS NULL OR (NOT lr_b.id = ANY(@linkedTo)))
                                                                              AND lr_b.created_by != lr_a.created_by
                                                                              AND matching_weekdays(lr_a.week_days, lr_b.week_days)::integer != 0
                                                                          LEFT JOIN liane_member lm_b ON
                                                                            lr_b.id = lm_b.liane_request_id AND (@linkedTo IS NULL OR (NOT lm_b.liane_id = ANY(@linkedTo)))
                                                                          INNER JOIN route b ON
                                                                            b.way_points = lr_b.way_points AND st_intersects(a.geometry, b.geometry)
                                                                  WHERE lr_a.created_by = @userId AND lm_a.liane_request_id IS NULL AND (@from IS NULL OR lr_a.id = @from)
                                                                  ) AS first_glance
                                                            WHERE st_length(intersection) / a_length > 0.35
                                                            ORDER BY st_length(intersection) / a_length DESC, "from"
                                                            """,
      new { userId, linkedTo = linkedTo?.ToArray(), from, to },
      tx
    );
    return result.ToImmutableList();
  }

  private async Task<Match?> ToMatch(ImmutableList<LianeRawMatch> rawMatches)
  {
    var first = rawMatches.First();
    var liane = (Ref<Api.Community.Liane>)first.LinkedTo ?? first.LianeRequest;

    var matchingPoints = rawMatches.Select(GetBestMatch)
      .Where(m => m is not null)
      .OrderByDescending(m => m!.Value.Score)
      .FirstOrDefault();
    if (matchingPoints is null)
    {
      return null;
    }

    var weekDays = rawMatches.Select(m => m.WeekDays)
      .AggregateRight((a, b) => a | b);

    var when = rawMatches.Select(m => new TimeRange(m.ArriveBefore, m.ReturnAfter))
      .AggregateRight((a, b) => a.Merge(b));

    var matches = rawMatches.Select(m => (Ref<LianeRequest>)m.LianeRequest).ToImmutableList();

    return new Match(
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

  private (Ref<RallyingPoint> Pickup, Ref<RallyingPoint> Deposit, float Score, bool Reverse)? GetBestMatch(LianeRawMatch match)
  {
    if (match.PickupPoint is null || match.DepositPoint is null)
    {
      if (match.PickupPointReverse is null || match.DepositPointReverse is null)
      {
        return null;
      }

      return (match.PickupPointReverse, match.DepositPointReverse, match.ScoreReverse, true);
    }

    return (match.PickupPoint, match.DepositPoint, match.Score, false);
  }
}

internal sealed record LianeRawMatch(
  Guid From,
  Guid LianeRequest,
  TimeOnly ArriveBefore,
  TimeOnly ReturnAfter,
  int TotalMembers,
  string[] WayPoints,
  DayOfWeekFlag WeekDays,
  float Score,
  LatLng Pickup,
  LatLng Deposit,
  Ref<RallyingPoint>? PickupPoint,
  Ref<RallyingPoint>? DepositPoint,
  float ScoreReverse,
  LatLng PickupReverse,
  LatLng DepositReverse,
  Ref<RallyingPoint>? PickupPointReverse,
  Ref<RallyingPoint>? DepositPointReverse,
  Guid? LinkedTo
);