using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Postgis;

public sealed class PostgisServiceImpl : IPostgisService
{
  private readonly PostgisDatabase db;
  private readonly ILogger<PostgisServiceImpl> logger;
  private readonly IRoutingService routingService;

  public PostgisServiceImpl(PostgisDatabase db, ILogger<PostgisServiceImpl> logger, IRoutingService routingService)
  {
    this.db = db;
    this.logger = logger;
    this.routingService = routingService;
  }

  public async Task UpdateSchema()
  {
    var assembly = typeof(PostgisUpdateService).Assembly;

    await using var stream = assembly.GetManifestResourceStream("Liane.Service.Resources.init.sql");
    if (stream is null)
    {
      throw new ResourceNotFoundException("Unable to find init.sql");
    }

    using var reader = new StreamReader(stream);
    var sql = await reader.ReadToEndAsync();
    using var connection = db.NewConnection();
    await connection.ExecuteAsync(sql);
  }

  public async Task UpdateGeometry(Api.Trip.Liane liane)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    await connection.ExecuteAsync("DELETE FROM liane_waypoint WHERE liane_id = @id", new { id = liane.Id }, tx);

    await GetStatsAndExecuteBatch(i => ComputeLianeBatch(i, liane), connection, tx);

    tx.Commit();
  }

  private async Task<BatchGeometryUpdate> ComputeLianeBatch(BatchGeometryUpdateInput input, Api.Trip.Liane liane)
  {
    var wayPoints = new List<LianeWayPointDb>();
    var segments = new List<SegmentDb>();

    for (var i = 0; i < liane.WayPoints.Count - 1; i++)
    {
      var from = liane.WayPoints[i].RallyingPoint;
      var to = liane.WayPoints[i + 1].RallyingPoint;
      if (input.Segments.Add((from.Id!, to.Id!)))
      {
        var route = await routingService.GetRoute(from.Location, to.Location);
        segments.Add(new SegmentDb(from.Id!, to.Id!, route.Coordinates.ToLineString()));
      }

      wayPoints.Add(new LianeWayPointDb(from.Id!, to.Id!, liane.Id, liane.WayPoints[i].Eta));
    }

    return new BatchGeometryUpdate(segments, wayPoints);
  }

  public async Task UpdateGeometry(Func<BatchGeometryUpdateInput, Task<BatchGeometryUpdate>> batch)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    await GetStatsAndExecuteBatch(batch, connection, tx);
    tx.Commit();
  }

  public async Task Clear(ImmutableList<string> lianes)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    await connection.ExecuteAsync("DELETE FROM liane_waypoint WHERE liane_id = ANY(@lianes)", new { lianes }, tx);
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

  private async Task UpdateGeometry(IDbConnection connection, List<SegmentDb> segments, List<LianeWayPointDb> lianeWaypoints, IDbTransaction tx)
  {
    var segmentsAdded = await connection.ExecuteAsync("INSERT INTO segment (from_id, to_id, geometry) VALUES (@from_id, @to_id, @geometry) ON CONFLICT DO NOTHING", segments, tx);
    var wayPointsAdded = await connection.ExecuteAsync("INSERT INTO liane_waypoint (from_id, to_id, liane_id, eta) VALUES (@from_id, @to_id, @liane_id, @eta)", lianeWaypoints, tx);
    var segmentsDeleted = await DeleteOrphanSegments(connection, tx);
    logger.LogInformation("Added {segmentsAdded} segments and {lianesAdded} liane waypoints. {segmentsDeleted} orphan segments", segmentsAdded, wayPointsAdded, segmentsDeleted);
  }

  private static async Task<int> DeleteOrphanSegments(IDbConnection connection, IDbTransaction tx)
  {
    return await connection.ExecuteAsync("DELETE FROM segment WHERE ARRAY [from_id, to_id] NOT IN (SELECT ARRAY [from_id, to_id] FROM liane_waypoint)", tx);
  }
}