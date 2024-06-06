using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using LianeRequest = Liane.Api.Community.LianeRequest;
using Match = Liane.Api.Community.Match;

namespace Liane.Service.Internal.Community;

public sealed class LianeMatcher(
  LianeRequestFetcher lianeRequestFetcher,
  LianeFetcher fetcher,
  IRallyingPointService rallyingPointService
)
{
  public async Task<ImmutableDictionary<Guid, LianeMatcherResult>> FindMatches(
    IDbConnection connection,
    IEnumerable<Guid> lianeRequestsId,
    ImmutableDictionary<Guid, ImmutableHashSet<Guid>> joinedLianeIds)
  {
    var rawMatches = (await FindRawMatches(connection, lianeRequestsId))
      .ToImmutableList();
    var allLianes = rawMatches.FilterSelect(r => r.Lianes)
      .SelectMany(r => r)
      .Distinct();
    var lianes = (await fetcher.FetchLianes(connection, allLianes))
      .ToImmutableDictionary(l => Guid.Parse(l.Id));
    var fetchLianeRequests = (await lianeRequestFetcher.FetchLianeRequests(connection, rawMatches.Select(m => m.LianeRequest)))
      .ToImmutableDictionary(r => r.Id!.Value);
    return await rawMatches
      .GroupByAsync(m => m.From, async g =>
      {
        var joinedLianesIds = joinedLianeIds.GetValueOrDefault(g.Key, ImmutableHashSet<Guid>.Empty);
        return (await GroupMatchByLiane(g, fetchLianeRequests, joinedLianesIds, lianes))
          .Split(joinedLianesIds);
      });
  }

  /// <summary>
  /// Récupère toutes les lianes request en base qui matche entre 2 à 2.<br/>
  /// Pour que 2 liane_request matchent :
  /// <ul>
  ///   <li>il faut que leurs trajets se croisent.</li>
  ///   <li>avec une intersection dont la longueur est au moins égale à 35% du trajet demandé.</li>
  ///   <li>que si elle appartienne déjà une liane, ce soit la même.</li>
  /// </ul> 
  /// </summary>
  private static async Task<IEnumerable<LianeRawMatch>> FindRawMatches(IDbConnection connection, IEnumerable<Guid> lianeRequests, IDbTransaction? tx = null)
  {
    return await connection.QueryAsync<LianeRawMatch>("""
                                                              SELECT liane_request_a.id AS "from",
                                                                     liane_request_b.id AS liane_request,
                                                                     liane_request_b.name AS name,
                                                                     liane_request_b.created_by AS "user",
                                                                     liane_request_b.way_points AS way_points,
                                                                     liane_request_b.is_enabled AS is_enabled,
                                                                     st_length(intersection) / a_length AS score,
                                                                     matching_weekdays(liane_request_a.week_days, liane_request_b.week_days) AS week_days,
                                                                     st_startpoint(intersection) AS pickup,
                                                                     st_endpoint(intersection) AS deposit,
                                                                     nearest_rp(st_startpoint(intersection)) AS pickup_point,
                                                                     nearest_rp(st_endpoint(intersection)) AS deposit_point,
                                                                     (SELECT array_agg(liane_id) FROM liane_member WHERE liane_request_id = liane_request_b.id) AS lianes
                                                              FROM (
                                                                      SELECT a.way_points AS a,
                                                                             b.way_points AS b,
                                                                             st_linemerge(st_intersection(a.geometry, b.geometry)) intersection,
                                                                             st_length(a.geometry) AS a_length
                                                                      FROM route a
                                                                        INNER JOIN route b ON st_intersects(a.geometry, b.geometry)
                                                                  ) AS matches
                                                              INNER JOIN liane_request liane_request_a ON
                                                                liane_request_a.way_points = a
                                                              INNER JOIN liane_request liane_request_b ON
                                                                liane_request_b.way_points = b AND liane_request_b.created_by != liane_request_a.created_by
                                                              LEFT JOIN liane_member ON
                                                                liane_request_id = liane_request_b.id
                                                              WHERE
                                                                matching_weekdays(liane_request_a.week_days, liane_request_b.week_days)::integer != 0
                                                                AND st_length(intersection) / a_length > 0.3
                                                                AND liane_request_a.id = ANY(@liane_requests)
                                                              ORDER BY st_length(intersection) / a_length DESC, liane_request_a.id
                                                      """,
      new { liane_requests = lianeRequests.ToArray() },
      tx
    );
  }

  private async Task<ImmutableList<Match>> GroupMatchByLiane(IEnumerable<LianeRawMatch> matches, ImmutableDictionary<Guid, LianeRequest> fetchLianeRequests, ImmutableHashSet<Guid> joinedLianeIds,
    ImmutableDictionary<Guid, Api.Community.Liane> lianes) =>
    (await matches
      .SelectMany(m => m.Lianes is null
        ? ImmutableList.Create(new LianeRawMatchByLiane(null, m))
        : m.Lianes.Select(l => new LianeRawMatchByLiane(l, m)))
      .Where(ml => ml.Match.IsEnabled || (ml.Liane is not null && joinedLianeIds.Contains(ml.Liane.Value)))
      .GroupBy(m => m.Liane)
      .SelectManyAsync<IGrouping<Guid?, LianeRawMatchByLiane>, Match>(async g =>
      {
        if (g.Key is null)
        {
          return await g
            .FilterSelectAsync(async m => (Match?)await ToSingleMatch(fetchLianeRequests, m.Match));
        }

        var groupedMatches = (await g
            .FilterSelectAsync(m => ToSingleMatch(fetchLianeRequests, m.Match)))
          .ToImmutableList();
        var liane = lianes.GetValueOrDefault(g.Key!.Value);
        if (liane is null)
        {
          return ImmutableList<Match>.Empty;
        }

        var first = groupedMatches.First();
        return ImmutableList.Create(new Match.Group(
          liane.Name,
          liane,
          groupedMatches,
          first.WeekDays,
          first.When,
          first.Pickup,
          first.Deposit,
          first.Score));
      }))
    .OrderByDescending(m => m.Score)
    .ThenByDescending(m => m switch
    {
      Match.Single => 1,
      Match.Group group => group.Matches.Count,
      _ => throw new ArgumentOutOfRangeException()
    })
    .ThenBy(m => m switch
    {
      Match.Single s => s.LianeRequest.Id,
      Match.Group group => group.Matches.First().LianeRequest.Id,
      _ => throw new ArgumentOutOfRangeException()
    })
    .ToImmutableList();

  private async Task<Match.Single?> ToSingleMatch(ImmutableDictionary<Guid, LianeRequest> fetchLianeRequests, LianeRawMatch match)
  {
    var lianeRequest = fetchLianeRequests.GetValueOrDefault(match.LianeRequest);
    if (lianeRequest is null)
    {
      return null;
    }

    if (match.PickupPoint is null || match.DepositPoint is null)
    {
      return null;
    }

    return new Match.Single(
      match.Name,
      lianeRequest,
      match.User,
      match.WeekDays,
      lianeRequest.When,
      await match.PickupPoint.Resolve(rallyingPointService.Get),
      await match.DepositPoint.Resolve(rallyingPointService.Get),
      match.Score
    );
  }
}

public static class LianeMatcherExtensions
{
  public static LianeMatcherResult Split(this IEnumerable<Match> allMatches, ImmutableHashSet<Guid> joinedLianesIds)
  {
    var set = joinedLianesIds.Select(i => i.ToString()).ToImmutableHashSet();
    var joinedLianes = new List<Match.Group>();
    var matches = new List<Match>();
    foreach (var match in allMatches)
    {
      if (match is Match.Group group && set.Contains(group.Liane.Id))
      {
        joinedLianes.Add(group);
      }
      else
      {
        matches.Add(match);
      }
    }

    return new LianeMatcherResult(joinedLianes.ToImmutableList(), matches.ToImmutableList());
  }
}

internal sealed record LianeRawMatch(
  Guid From,
  Guid LianeRequest,
  string Name,
  string User,
  string[] WayPoints,
  bool IsEnabled,
  float Score,
  DayOfWeekFlag WeekDays,
  LatLng Pickup,
  LatLng Deposit,
  Ref<RallyingPoint>? PickupPoint,
  Ref<RallyingPoint>? DepositPoint,
  Guid[]? Lianes
);

internal readonly record struct LianeRawMatchByLiane(Guid? Liane, LianeRawMatch Match);