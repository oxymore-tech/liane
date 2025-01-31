using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Sql;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Postgis;

public sealed partial class PostgisServiceImpl(PostgisDatabase db, ILogger<PostgisServiceImpl> logger, IRoutingService routingService) : IPostgisService
{
  public async Task UpdateGeometry(Api.Trip.Trip trip)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    await connection.ExecuteAsync("DELETE FROM liane_waypoint WHERE liane_id = @id", new { id = trip.Id }, tx);

    await InsertLianeWaypoints(trip, connection, tx);
    await DeleteOrphanSegments(connection, tx);
    tx.Commit();
  }

  private async Task InsertLianeWaypoints(Api.Trip.Trip trip, IDbConnection connection, IDbTransaction tx)
  {
    if (trip.Members.Select(m => m.SeatCount).Aggregate(0, (v, acc) => v + acc) > 0)
    {
      // Only add liane to research if it has available seats
      await GetStatsAndExecuteBatch(i => ComputeLianeBatch(i, trip), connection, tx);
    }
  }

  public async Task<ImmutableList<Ref<Api.Trip.Trip>>> ListSearchableLianes()
  {
    using var connection = db.NewConnection();
    var results = await connection.QueryAsync<string>(
      "SELECT liane_id FROM liane_waypoint");
    return results.Select(id => (Ref<Api.Trip.Trip>)id).ToImmutableList();
  }

  public async Task<ImmutableList<Ref<Api.Trip.Trip>>> ListOngoingLianes()
  {
    using var connection = db.NewConnection();
    var results = await connection.QueryAsync<string>(
      "SELECT id FROM ongoing_trip");
    return results.Select(id => (Ref<Api.Trip.Trip>)id).ToImmutableList();
  }

  public async Task<ImmutableList<LianeMatchCandidate>> GetMatchingLianes(Route targetRoute, DateTime from, DateTime to)
  {
    using var connection = db.NewConnection();
    var candidates = await connection.QueryAsync<LianeMatchCandidate>(
      "SELECT liane_id as liane, pickup, deposit, l_start as start_fraction, l_end as end_fraction, mode FROM match_liane(@route::geometry(LineString, 4326), @from, @to)",
      new { from = from.ToUniversalTime(), to = to.ToUniversalTime(), route = targetRoute.Coordinates.ToLineString() });
    return candidates.ToImmutableList();
  }

  public async Task<ImmutableList<LianeMatchCandidate>> GetMatchingLianes(LatLng pickup, LatLng deposit, DateTime from, DateTime to)
  {
    using var connection = db.NewConnection();
    var candidates = await connection.QueryAsync<LianeMatchCandidate>(
      "SELECT liane_id as liane, pickup, deposit, l_start as start_fraction, l_end as end_fraction, mode FROM match_liane_by_rallying_points(@pickup_location::geometry(Point, 4326), @deposit_location::geometry(Point, 4326), @from, @to)",
      new { from = from.ToUniversalTime(), to = to.ToUniversalTime(), pickup_location = pickup, deposit_location = deposit });
    return candidates.ToImmutableList();
  }

  private async Task<BatchGeometryUpdate> ComputeLianeBatch(BatchGeometryUpdateInput input, Api.Trip.Trip trip)
  {
    var wayPoints = new List<LianeWaypointDb>();
    var segments = new List<SegmentDb>();

    for (var i = 0; i < trip.WayPoints.Count - 1; i++)
    {
      var from = trip.WayPoints[i].RallyingPoint;
      var to = trip.WayPoints[i + 1].RallyingPoint;
      if (input.Segments.Add((from.Id!, to.Id!)))
      {
        var route = await routingService.GetRoute(from.Location, to.Location);
        segments.Add(new SegmentDb(from.Id!, to.Id!, route.Coordinates.ToLineString()));
      }

      wayPoints.Add(new LianeWaypointDb(from.Id!, to.Id!, trip.Id, trip.WayPoints[i].Eta));
    }

    return new BatchGeometryUpdate(segments, wayPoints);
  }

  public async Task Clear(IEnumerable<Ref<Api.Trip.Trip>> lianes)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    await connection.DeleteAsync(Filter<LianeWaypointDb>.Where(l => l.liane_id, ComparisonOperator.In, lianes.Select(id => (string)id)), tx);
    await DeleteOrphanSegments(connection, tx);
    tx.Commit();
  }

  private async Task GetStatsAndExecuteBatch(Func<BatchGeometryUpdateInput, Task<BatchGeometryUpdate>> batch, IDbConnection connection, IDbTransaction tx)
  {
    var existingLianes = (await connection.QueryAsync<string>("SELECT DISTINCT liane_id FROM liane_waypoint"))
      .ToHashSet();
    var existingSegments = (await connection.QueryAsync<(string, string)>("SELECT DISTINCT from_id, to_id FROM segment"))
      .ToHashSet();
    var (segments, waypoints) = await batch(new BatchGeometryUpdateInput(existingLianes, existingSegments));
    await UpdateGeometry(connection, segments, waypoints, tx);
  }

  private async Task UpdateGeometry(IDbConnection connection, IEnumerable<SegmentDb> segments, IEnumerable<LianeWaypointDb> lianeWaypoints, IDbTransaction tx)
  {
    var segmentsAdded = await connection.MergeMultipleAsync(segments, tx);
    var wayPointsAdded = await connection.MergeMultipleAsync(lianeWaypoints, tx);
    logger.LogInformation("Added {segmentsAdded} segments and {wayPointsAdded} liane waypoints.", segmentsAdded, wayPointsAdded);
  }

  private async Task DeleteOrphanSegments(IDbConnection connection, IDbTransaction tx)
  {
    var segmentsDeleted = await connection.ExecuteAsync("DELETE FROM segment WHERE ARRAY [from_id, to_id] NOT IN (SELECT ARRAY [from_id, to_id] FROM liane_waypoint)", tx);
    logger.LogInformation("Deleted {segmentsDeleted} orphan segments.", segmentsDeleted);
  }
}