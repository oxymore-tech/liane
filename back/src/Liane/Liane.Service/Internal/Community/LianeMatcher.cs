using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Util;
using Match = Liane.Api.Community.Match;
using LianeRawMatch =
  (System.Guid, System.Guid, string, string, string[], bool, float, Liane.Api.Trip.DayOfWeekFlag, Liane.Api.Routing.LatLng, Liane.Api.Routing.LatLng, string?, string?, System.Guid[]?);

namespace Liane.Service.Internal.Community;

public sealed class LianeMatcher(LianeFetcher fetcher)
{
  public async Task<ImmutableDictionary<Guid, LianeMatcherResult>> FindMatches(
    IDbConnection connection,
    IEnumerable<Guid> lianeRequestsId,
    ImmutableDictionary<Guid, ImmutableHashSet<Guid>> joinedLianeIds)
  {
    var rawMatches = (await FindRawMatches(connection, lianeRequestsId))
      .ToImmutableList();
    var allLianes = rawMatches.FilterSelect(r => r.Item13)
      .SelectMany(r => r)
      .Distinct();
    var lianes = (await fetcher.FetchLianes(connection, allLianes))
      .ToImmutableDictionary(l => Guid.Parse(l.Id));
    return rawMatches
      .GroupBy(m => m.Item1)
      .ToImmutableDictionary(g => g.Key, g =>
      {
        var joinedLianesIds = joinedLianeIds.GetValueOrDefault(g.Key, ImmutableHashSet<Guid>.Empty);
        return GroupMatchByLiane(g, joinedLianesIds, lianes)
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

  private static ImmutableList<Match> GroupMatchByLiane(IEnumerable<LianeRawMatch> matches, ImmutableHashSet<Guid> joinedLianeIds, ImmutableDictionary<Guid, Api.Community.Liane> lianes)
    => matches
      .SelectMany(m => m.Item13 is null
        ? ImmutableList.Create(new LianeRawMatchByLiane(null, m))
        : m.Item13.Select(l => new LianeRawMatchByLiane(l, m)))
      .Where(ml => ml.Match.Item6 || (ml.Liane is not null && joinedLianeIds.Contains(ml.Liane.Value)))
      .GroupBy(m => m.Liane)
      .SelectMany(g =>
      {
        if (g.Key is null)
        {
          return g.Select(m => (Match)ToSingleMatch(m.Match));
        }

        var groupedMatches = g.Select(m => ToSingleMatch(m.Match))
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
          first.Pickup,
          first.Deposit,
          first.Score));
      })
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

  private static Match.Single ToSingleMatch(LianeRawMatch match)
  {
    return new Match.Single(
      match.Item3,
      match.Item2.ToString(),
      match.Item4,
      match.Item8,
      match.Item11,
      match.Item12,
      match.Item7
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

internal readonly record struct LianeRawMatchByLiane(Guid? Liane, LianeRawMatch Match);