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
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Geo;
using Liane.Service.Internal.Util.Sql;
using NetTopologySuite.Geometries;
using UuidExtensions;
using LianeMatch = Liane.Api.Community.LianeMatch;
using LianeRequest = Liane.Api.Community.LianeRequest;
using LianeState = Liane.Api.Community.LianeState;
using Match = Liane.Api.Community.Match;

namespace Liane.Service.Internal.Community;

public sealed class LianeServiceImpl(
  PostgisDatabase db,
  ICurrentContext currentContext,
  IRoutingService routingService,
  IRallyingPointService rallyingPointService,
  LianeFetcher lianeFetcher,
  LianeRequestFetcher lianeRequestFetcher,
  LianeMatcher matcher,
  LianeMessageServiceImpl lianeMessageService,
  ITripService tripService,
  EventDispatcher eventDispatcher) : ILianeService
{
  public async Task<LianeRequest> Create(LianeRequest request)
  {
    var wayPoints = request.WayPoints.Distinct().ToImmutableList();
    if (wayPoints.Count <= 1)
    {
      throw new ArgumentException("At least 2 waypoints are required");
    }

    if (request.WeekDays.IsEmpty())
    {
      throw new ArgumentException("At least 1 weekday is required");
    }

    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var id = request.Id ?? Uuid7.Guid();

    var wayPointsArray = request.WayPoints.Deref();
    var coordinates = (await request.WayPoints.SelectAsync(rallyingPointService.Get))
      .Select(w => w.Location)
      .ToImmutableList();
    var route = await routingService.GetRoute(coordinates);
    await connection.MergeAsync(new RouteDb(wayPointsArray, route.Coordinates.ToLineString()), tx);

    if (request.RoundTrip)
    {
      var reverseRoute = await routingService.GetRoute(coordinates.Reverse());
      await connection.MergeAsync(new RouteDb(wayPointsArray.Reverse().ToArray(), reverseRoute.Coordinates.ToLineString()), tx);
    }

    var now = DateTime.UtcNow;
    var lianeRequestDb = new LianeRequestDb(id, request.Name, wayPointsArray, request.RoundTrip, request.ArriveBefore, request.ReturnAfter, request.CanDrive, request.WeekDays, request.IsEnabled,
      userId, now);

    await connection.InsertAsync(lianeRequestDb, tx);

    tx.Commit();

    var created = await lianeRequestFetcher.FetchLianeRequest(connection, id, tx);

    return created;
  }

  public async Task<ImmutableList<LianeMatch>> Match()
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequests = await lianeRequestFetcher.FetchLianeRequests(connection, Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId));

    var linkedTo = (await connection.QueryAsync(Query.Select<LianeMemberDb>()
        .Where(Filter<LianeMemberDb>.Where(m => m.LianeRequestId, ComparisonOperator.In, lianeRequests.Select(r => r.Id!.Value)))))
      .ToImmutableDictionary(m => m.LianeRequestId);

    var lianeFilter = linkedTo.Values.Select(s => s.LianeId).ToImmutableList();

    var matches = await matcher.FindMatches(connection, lianeFilter);
    var linkedToLianes = await lianeFetcher.FetchLianes(connection, lianeFilter);

    return lianeRequests.Select(r =>
    {
      if (linkedTo.TryGetValue(r.Id!.Value, out var member))
      {
        var liane = linkedToLianes.GetValueOrDefault(member.LianeId);
        if (liane is not null)
        {
          return new LianeMatch(
            r,
            member.JoinedAt is null
              ? new LianeState.Pending(liane)
              : new LianeState.Attached(liane)
          );
        }
      }

      var result = matches.GetValueOrDefault(r.Id!.Value, ImmutableList<Match>.Empty);
      return new LianeMatch(
        r,
        new LianeState.Detached(result)
      );
    }).ToImmutableList();
  }

  public async Task<ImmutableList<Api.Community.Liane>> List(LianeFilter filter)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();

    var lianeRequestFilter = Filter<LianeRequestDb>.Empty;

    if (filter.ForCurrentUser)
    {
      lianeRequestFilter &= Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId);
    }

    if (filter.Bbox is not null)
    {
      var ids = await connection.QueryAsync<Guid>("""
                                                  SELECT DISTINCT COALESCE(lm.liane_id, lr.id) AS id
                                                  FROM liane_request lr
                                                  INNER JOIN  route r ON lr.way_points = r.way_points
                                                  LEFT JOIN liane_member lm ON lr.id = lm.liane_request_id
                                                  WHERE ST_Intersects(@bbox, r.geometry)
                                                  """, new { bbox = filter.Bbox.AsPolygon() });
      lianeRequestFilter &= Filter<LianeRequestDb>.Where(r => r.Id, ComparisonOperator.In, ids);
    }

    IEnumerable<LianeRequest> lianeRequests = await lianeRequestFetcher.FetchLianeRequests(connection, lianeRequestFilter);

    if (filter.WeekDays is not null)
    {
      lianeRequests = lianeRequests.Where(r => r.WeekDays.HasFlag(filter.WeekDays.Value));
    }

    return (await lianeFetcher.FetchLianes(connection, lianeRequests.Select(l => l.Id!.Value).Take(20))).Values
      .OrderByDescending(l => l.TotalMembers)
      .ThenByDescending(l => l.WeekDays)
      .ThenByDescending(l => l.ReturnAfter - l.ArriveBefore)
      .ThenBy(l => l.Id)
      .ToImmutableList();
  }

  public async Task<LianeRequest> Update(Ref<LianeRequest> id, LianeRequest request)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    var lianeRequestId = Guid.Parse(id);

    var updated = await connection.UpdateAsync(Query.Update<LianeRequestDb>()
      .Set(r => r.Name, request.Name)
      .Set(r => r.IsEnabled, request.IsEnabled)
      .Set(r => r.RoundTrip, request.RoundTrip)
      .Where(r => r.Id, ComparisonOperator.Eq, lianeRequestId)
      .And(r => r.CreatedBy, ComparisonOperator.Eq, userId));

    if (updated == 0)
    {
      throw new UnauthorizedAccessException("User is not the owner of the liane request");
    }

    var lianeRequestDb = await connection.GetAsync<LianeRequestDb>(lianeRequestId);

    return new LianeRequest(
      lianeRequestDb.Id,
      lianeRequestDb.Name,
      await lianeRequestDb.WayPoints.AsRef<RallyingPoint>(rallyingPointService.Get),
      lianeRequestDb.RoundTrip,
      lianeRequestDb.ArriveBefore,
      lianeRequestDb.ReturnAfter,
      lianeRequestDb.CanDrive,
      lianeRequestDb.WeekDays,
      lianeRequestDb.IsEnabled,
      lianeRequestDb.CreatedBy,
      lianeRequestDb.CreatedAt
    );
  }

  public async Task Delete(Ref<LianeRequest> id)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var lianeRequestId = Guid.Parse(id);

    var lianeRequest = await connection.FirstOrDefaultAsync(
      Query.Select<LianeRequestDb>()
        .Where(r => r.Id, ComparisonOperator.Eq, lianeRequestId)
        .And(r => r.CreatedBy, ComparisonOperator.Eq, userId)
      , tx);

    if (lianeRequest is null)
    {
      return;
    }

    await connection.DeleteAsync(Filter<LianeMemberDb>.Where(m => m.LianeRequestId, ComparisonOperator.Eq, lianeRequestId), tx);

    await connection.DeleteAsync(
      Filter<LianeRequestDb>.Where(r => r.Id, ComparisonOperator.Eq, lianeRequestId)
      & Filter<LianeRequestDb>.Where(r => r.CreatedBy, ComparisonOperator.Eq, userId)
      , tx);

    tx.Commit();
  }

  public async Task<bool> JoinRequest(Ref<LianeRequest> mine, Ref<Api.Community.Liane> foreign)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var mineId = mine.IdAsGuid();

    var foreignId = foreign.IdAsGuid();

    var alreadyMember = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, foreignId), tx);

    var lianeId = alreadyMember?.LianeId ?? foreignId;

    var liane = await lianeFetcher.TryFetchLiane(connection, lianeId, tx);
    var userId = currentContext.CurrentUser().Id;
    if (liane is not null && liane.Members.Any(m => m.User.Id == userId))
    {
      return false;
    }

    var from = await connection.GetAsync<LianeRequestDb, Guid>(mineId, tx);

    if (from.CreatedBy.Id != userId)
    {
      throw new UnauthorizedAccessException("User is not the owner of the liane request");
    }

    await connection.MergeAsync(new LianeMemberDb(from.Id, lianeId, DateTime.UtcNow, null, null), tx);

    tx.Commit();

    var recipient = liane is not null ? liane.CreatedBy.Id : userId;
    await eventDispatcher.Dispatch(foreign, new MessageContent.MemberRequested("", recipient, mineId));
    return true;
  }

  public async Task<Api.Community.Liane> Accept(Ref<LianeRequest> lianeRequest, Ref<Api.Community.Liane> foreign)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var foreignId = foreign.IdAsGuid();

    var foreignLiane = await lianeFetcher.FetchLiane(connection, foreignId, tx);
    if (foreignLiane.CreatedBy.Id != userId && foreignLiane.Members.All(m => m.User.Id != userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    var resolvedLianeRequest = await connection.GetAsync<LianeRequestDb>(lianeRequest.IdAsGuid(), tx);

    var alreadyMember = await connection.FirstOrDefaultAsync(Query.Select<LianeMemberDb>().Where(m => m.LianeRequestId, ComparisonOperator.Eq, foreignId), tx);

    var lianeId = alreadyMember?.LianeId ?? foreignId;
    if (alreadyMember is null)
    {
      await connection.MergeAsync(new LianeMemberDb(lianeId, lianeId, DateTime.UtcNow, DateTime.UtcNow, null), tx);
    }

    var updated = await connection.UpdateAsync(Query.Update<LianeMemberDb>()
      .Where(m => m.LianeRequestId, ComparisonOperator.Eq, lianeRequest.IdAsGuid())
      .And(m => m.LianeId, ComparisonOperator.Eq, lianeId)
      .Set(m => m.JoinedAt, DateTime.UtcNow), tx);

    if (updated == 0)
    {
      throw new ResourceNotFoundException($"No join request found between {lianeRequest} and {lianeId}");
    }

    var liane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();

    await eventDispatcher.Dispatch(foreign, new MessageContent.MemberAdded("", resolvedLianeRequest.CreatedBy, resolvedLianeRequest.Id));
    return liane;
  }

  public async Task<Api.Community.Liane> Reject(Ref<LianeRequest> lianeRequest, Ref<Api.Community.Liane> foreign)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var lianeId = foreign.IdAsGuid();

    var foreignLiane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    if (foreignLiane.Members.Count > 0 && foreignLiane.Members.All(m => m.User.Id != userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    var deleted = await connection.DeleteAsync(Filter<LianeMemberDb>
      .Where(m => m.LianeRequestId, ComparisonOperator.Eq, lianeRequest.IdAsGuid())
      .And(m => m.LianeId, ComparisonOperator.Eq, lianeId)
      .And(m => m.JoinedAt, ComparisonOperator.Eq, null), tx);

    if (deleted == 0)
    {
      throw new ResourceNotFoundException($"No join request found between {lianeRequest} and {lianeId}");
    }

    var resolvedLianeRequest = await connection.GetAsync<LianeRequestDb>(lianeRequest.IdAsGuid(), tx);

    var liane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    tx.Commit();

    await eventDispatcher.Dispatch(foreign, new MessageContent.MemberRejected("", resolvedLianeRequest.CreatedBy));
    return liane;
  }

  public async Task<Api.Community.Liane> Get(Ref<Api.Community.Liane> id)
  {
    using var connection = db.NewConnection();
    var userId = currentContext.CurrentUser().Id;

    var liane = await lianeFetcher.FetchLiane(connection, id.IdAsGuid());
    if (!liane.IsMember(userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    return liane;
  }

  public async Task<ImmutableList<WayPoint>> GetTrip(Guid liane, Guid? lianeRequest)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var (rallyingPoints, arriveBefore, at) = await GetBestTrip(connection, liane, lianeRequest, tx);

    var wayPoints = await routingService.GetOptimizedTrip(rallyingPoints);

    var computedTime = TimeOnly.FromDateTime(wayPoints.First(w => w.RallyingPoint.Id == at.Id).Eta);
    var diff = computedTime - arriveBefore;

    return wayPoints.Select(w => w with { Eta = w.Eta - diff }).ToImmutableList();
  }

  public async Task<bool> JoinTrip(JoinTripQuery query)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;

    var trip = await tripService.Get(query.Trip);
    var liane = await lianeFetcher.FetchLiane(connection, trip.Liane.IdAsGuid(), tx);

    var member = liane.Members.FirstOrDefault(m => m.User.Id == userId);
    var driver = liane.Members.FirstOrDefault(m => m.User.Id == trip.Driver.User.Id);

    if (member is null)
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    if (driver is null)
    {
      throw new UnauthorizedAccessException("Driver is not part of the liane");
    }

    var match = await matcher.FindMatchBetween(connection, member.LianeRequest.IdAsGuid(), driver.LianeRequest.IdAsGuid(), tx);
    if (match is null)
    {
      return false;
    }

    var direction = CheckDirection(ImmutableList.Create<Ref<RallyingPoint>>(match.Pickup, match.Deposit), trip.WayPoints);
    var (pickup, deposit) = direction == Direction.Outbound
      ? (match.Pickup, match.Deposit)
      : (match.Deposit, match.Pickup);

    await tripService.AddMember(trip, new TripMember(userId, pickup, deposit));
    return true;
  }

  private static Direction CheckDirection(ImmutableList<Ref<RallyingPoint>> lianeRequestWayPoints, ImmutableList<WayPoint> tripWayPoints)
  {
    int? lastIndex = null;
    foreach (var wayPoint in tripWayPoints)
    {
      var indexOf = lianeRequestWayPoints.IndexOf(wayPoint.RallyingPoint);
      if (indexOf == -1)
      {
        continue;
      }

      if (lastIndex is null)
      {
        lastIndex = indexOf;
        continue;
      }

      if (indexOf < lastIndex)
      {
        return Direction.Inbound;
      }
    }

    return Direction.Outbound;
  }

  public async Task<bool> Leave(Ref<Api.Community.Liane> liane)
  {
    var userId = currentContext.CurrentUser().Id;
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var lianeId = Guid.Parse(liane.Id);
    var lianeMemberDb = await lianeMessageService.TryGetMember(connection, lianeId, userId, tx);
    if (lianeMemberDb is null)
    {
      return false;
    }

    await connection.ExecuteAsync("DELETE FROM liane_member WHERE liane_id = @liane_id AND liane_request_id = @liane_request_id",
      new { liane_id = lianeMemberDb.LianeId, liane_request_id = lianeMemberDb.LianeRequestId }, tx);
    tx.Commit();

    await eventDispatcher.Dispatch(liane, new MessageContent.MemberLeft("", userId));

    return true;
  }

  private async Task<(ImmutableList<RallyingPoint> WayPoints, TimeOnly ArriveBefore, Ref<RallyingPoint> At)> GetBestTrip(IDbConnection connection, Guid liane, Guid? lianeRequest,
    IDbTransaction? tx = null)
  {
    var resolved = await lianeFetcher.FetchLiane(connection, liane, tx);
    if (lianeRequest is null)
    {
      return (resolved.WayPoints, resolved.ArriveBefore, resolved.WayPoints.Last());
    }

    var matches = await matcher.FindMatchesBetween(connection, lianeRequest.Value, resolved.Members.Select(m => m.LianeRequest.IdAsGuid()).ToImmutableList(), tx);

    var bestMatch = matches.FirstOrDefault();
    if (bestMatch is null)
    {
      return (resolved.WayPoints, resolved.ArriveBefore, resolved.WayPoints.Last());
    }

    return (
      resolved.WayPoints.Append(bestMatch.Pickup).Append(bestMatch.Deposit).DistinctBy(w => w.Id).ToImmutableList(),
      resolved.ArriveBefore,
      resolved.WayPoints.Last()
    );
  }
}

public sealed record LianeMemberDb(
  Guid LianeRequestId,
  Guid LianeId,
  DateTime? RequestedAt,
  DateTime? JoinedAt,
  DateTime? LastReadAt
);

public sealed record LianeRequestDb(
  Guid Id,
  string Name,
  string[] WayPoints,
  bool RoundTrip,
  TimeOnly ArriveBefore,
  TimeOnly ReturnAfter,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  bool IsEnabled,
  Ref<Api.Auth.User> CreatedBy,
  DateTime CreatedAt
) : IIdentity<Guid>;

public sealed record RouteDb(
  string[] WayPoints,
  LineString Geometry
);

public sealed record LianeMessageDb(
  Guid Id,
  Guid LianeId,
  MessageContent Content,
  Ref<Api.Auth.User> CreatedBy,
  DateTime? CreatedAt
) : IEntity<Guid>;

enum Direction
{
  Outbound,
  Inbound
};