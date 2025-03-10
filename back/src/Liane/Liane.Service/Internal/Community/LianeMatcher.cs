using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Auth;
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

public sealed class LianeMatcher(IRallyingPointService rallyingPointService, ICurrentContext currentContext, LianeFetcher lianeFetcher, IUserService userService)
{
  public const float MinScore = 0.33333f;

  public async Task<Match?> FindMatchBetween(IDbConnection connection, Guid from, Guid to, IDbTransaction? tx = null)
  {
    var matches = await FindMatches(connection, ImmutableList<Guid>.Empty, from, to, tx);
    return matches.GetValueOrDefault(from)?.FirstOrDefault();
  }

  public async Task<ImmutableList<Match>> FindLianeMatch(IDbConnection connection, Guid from, IDbTransaction? tx = null)
  {
    var matches = await FindMatches(connection, ImmutableList<Guid>.Empty, from, null, tx);
    return matches.GetValueOrDefault(from, ImmutableList<Match>.Empty);
  }

  public async Task<ImmutableDictionary<Guid, ImmutableList<Match>>> FindMatches(IDbConnection connection, IEnumerable<Guid> linkedTo, IDbTransaction? tx = null)
    => await FindMatches(connection, linkedTo, null, null, tx);

  private async Task<ImmutableDictionary<Guid, ImmutableList<Match>>> FindMatches(IDbConnection connection, IEnumerable<Guid> linkedTo, Guid? from = null, Guid? to = null, IDbTransaction? tx = null)
  {
    var userId = currentContext.CurrentUser().Id;
    var rawMatches = await FindRawMatches(connection, userId, linkedTo, from, to, tx);
    var mapParams = await GetMapParams(connection, rawMatches, userId, tx);
    var checkScore = from is null || to is null;
    return await rawMatches
      .GroupByAsync(m => m.From, g => MapToMatches(g, mapParams, checkScore));
  }

  private async Task<ImmutableList<Match>> MapToMatches(IEnumerable<LianeRawMatch> rawMatches, MapParams mapParams, bool checkScore)
  {
    var matches = await rawMatches.GroupBy(m => m.LinkedTo ?? m.LianeRequest)
      .FilterSelectAsync(r => ToMatch(r.Key, r.ToImmutableList(), mapParams, checkScore));
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
                                                              SELECT lr_a.id AS "from",
                                                                     lr_b.id AS liane_request,
                                                                     lr_b.name AS name,
                                                                     lr_b.arrive_before AS arrive_before,
                                                                     lr_b.return_after AS return_after,
                                                                     matching_weekdays(lr_a.week_days, lr_b.week_days) AS week_days,
                                                                     ((match_routes(a.geometry, b.geometry)).score) AS score,
                                                                     ((match_routes(a.geometry, b.geometry)).pickup) AS pickup,
                                                                     ((match_routes(a.geometry, b.geometry)).deposit) AS deposit,
                                                                     ((match_routes(a.geometry, b.geometry)).is_reverse_direction) AS is_reverse_direction,
                                                                     lm_b.liane_id AS linked_to,
                                                                     lr_b.created_by AS created_by
                                                              FROM liane_request lr_a
                                                                      INNER JOIN route a ON
                                                                        a.way_points = lr_a.way_points
                                                                      INNER JOIN liane_request lr_b ON
                                                                        lr_b.id != lr_a.id
                                                                          AND NOT lr_b.id = ANY(@linkedTo)
                                                                          AND lr_b.created_by != lr_a.created_by
                                                                          AND matching_weekdays(lr_a.week_days, lr_b.week_days)::integer != 0
                                                                      LEFT JOIN liane_member lm_b ON
                                                                        lr_b.id = lm_b.liane_request_id
                                                                          AND lm_b.joined_at IS NOT NULL
                                                                      INNER JOIN route b ON
                                                                        b.way_points = lr_b.way_points AND st_intersects(a.geometry, b.geometry)
                                                              WHERE
                                                                ((@from IS NULL AND lr_a.created_by = @userId) OR (lr_a.id = @from OR lm_b.liane_id = @from))
                                                                AND ((@to IS NULL AND lr_b.is_enabled) OR (lr_b.id = @to OR lm_b.liane_id = @to))
                                                                AND (lm_b.liane_id is NULL OR NOT lm_b.liane_id = ANY(@linkedTo))
                                                              ORDER BY ((match_routes(a.geometry, b.geometry)).score) DESC, "from"
                                                            """,
      new { userId, linkedTo = linkedTo.ToArray(), from, to },
      tx
    );
    return result.ToImmutableList();
  }

  private async Task<Match?> ToMatch(Guid lianeKey, ImmutableList<LianeRawMatch> rawMatches, MapParams mapParams, bool checkScore)
  {
    if (rawMatches.IsEmpty)
    {
      return null;
    }

    var first = rawMatches.First();
    
    var liane = first.LinkedTo is not null ? mapParams.Lianes.GetValueOrDefault(first.LinkedTo!.Value) : null;

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

    if (liane is null)
    {
      var joinRequest = GetJoinRequest(mapParams, first.LianeRequest);
      if (checkScore && joinRequest is null && (matchingPoints.Value.Score < MinScore || matchingPoints.Value.Reverse))
      {
        return null;
      }

      if (first.LinkedTo is not null && first.LinkedTo != lianeKey)
      {
        return null;
      }

      var user = await userService.Get(first.CreatedBy);
      return new Match.Single(
        first.LianeRequest,
        ImmutableList.Create(user),
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
      var matches = rawMatches.Select(m => (Ref<LianeRequest>)m.LianeRequest).ToImmutableList();
      if (checkScore && (matchingPoints.Value.Score < MinScore || matchingPoints.Value.Reverse))
      {
        return null;
      }
      
      return new Match.Group(
        lianeKey,
        liane.GetMembers(),
        matches,
        weekDays,
        when,
        await matchingPoints.Value.Pickup.Resolve(rallyingPointService.Get),
        await matchingPoints.Value.Deposit.Resolve(rallyingPointService.Get),
        matchingPoints.Value.Score,
        matchingPoints.Value.Reverse,
        mapParams.PendingMemberRequests.TryGetValue(lianeKey, out var d) ? d : null
      );
    }
  }

  private static JoinRequest? GetJoinRequest(MapParams mapParams, Guid foreign)
  {
    if (mapParams.PendingJoinRequests.TryGetValue(foreign, out var d))
    {
      return new JoinRequest.Pending(d);
    }

    if (mapParams.ReceivedJoinRequests.TryGetValue(foreign, out var d2))
    {
      return new JoinRequest.Received(d2);
    }

    return null;
  }

  private static (Ref<RallyingPoint> Pickup, Ref<RallyingPoint> Deposit, float Score, bool Reverse)? GetBestMatch(LianeRawMatch match, ImmutableDictionary<LatLng, RallyingPoint> snapedPoints)
  {
    var pickup = match.Pickup.GetOrDefault(snapedPoints.GetValueOrDefault);
    var deposit = match.Deposit.GetOrDefault(snapedPoints.GetValueOrDefault);

    if (pickup is null || deposit is null)
    {
      return null;
    }

    return match.IsReverseDirection
      ? (deposit, pickup, match.Score, true)
      : (pickup, deposit, match.Score, false);
  }

  private async Task<MapParams> GetMapParams(IDbConnection connection, ImmutableList<LianeRawMatch> rawMatches, string userId, IDbTransaction? tx = null)
  {
    var lianes = await lianeFetcher.FetchLianes(connection, rawMatches.FilterSelect(r => r.LinkedTo).Distinct(), tx);
    var snapedPoints = await rallyingPointService.Snap(rawMatches.FilterSelectMany<LianeRawMatch, LatLng>(r => [r.Deposit, r.Pickup]).ToImmutableHashSet());
    var pendingJoinRequests = (await connection.QueryAsync<(Guid, DateTime)>(
        """
        SELECT j.requestee_id, j.requested_at
        FROM liane_request lr
                 INNER JOIN join_request j ON j.requester_id = lr.id
        WHERE lr.created_by = @userId
        """,
        new { userId }, tx)
      ).ToImmutableDictionary(m => m.Item1, m => m.Item2);
    var receivedJoinRequests = (await connection.QueryAsync<(Guid, DateTime)>(
        """
        SELECT j.requester_id, j.requested_at
        FROM liane_request lr
                 INNER JOIN join_request j ON j.requestee_id = lr.id
        WHERE lr.created_by = @userId
        """,
        new { userId }, tx)
      ).ToImmutableDictionary(m => m.Item1, m => m.Item2);
    var pendingMemberRequests = (await connection.QueryAsync<(Guid, DateTime)>(
        """
        SELECT liane_member.liane_id, requested_at
        FROM liane_request
                 INNER JOIN liane_member ON liane_request.id = liane_member.liane_request_id
        WHERE liane_request.created_by = @userId
          AND liane_member.joined_at IS NULL
        """,
        new { userId }, tx)
      ).ToImmutableDictionary(m => m.Item1, m => m.Item2);
    return new MapParams(snapedPoints, pendingJoinRequests, receivedJoinRequests, pendingMemberRequests, lianes);
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
  bool IsReverseDirection,
  Guid? LinkedTo,
  string CreatedBy
);

internal sealed record MapParams(
  ImmutableDictionary<LatLng, RallyingPoint> SnapedPoints,
  ImmutableDictionary<Guid, DateTime> PendingJoinRequests,
  ImmutableDictionary<Guid, DateTime> ReceivedJoinRequests,
  ImmutableDictionary<Guid, DateTime> PendingMemberRequests,
  ImmutableDictionary<Guid, Api.Community.Liane> Lianes
);