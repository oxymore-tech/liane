using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using JsonSerializer = System.Text.Json.JsonSerializer;

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

  public async Task UpdateGeometry(Api.Trip.Liane liane)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    await connection.ExecuteAsync("DELETE FROM liane_waypoint WHERE liane_id = @id", new { id = liane.Id }, tx);

    await GetStatsAndExecuteBatch(i => ComputeLianeBatch(i, liane), connection, tx);

    tx.Commit();
  }

  public async Task ClearRallyingPoints()
  {
    using var connection = db.NewConnection();
    await connection.ExecuteAsync("DELETE FROM rallying_point");
  }

  public async Task InsertRallyingPoints(IEnumerable<RallyingPoint> rallyingPoints)
  {
    using var connection = db.NewConnection();
    var parameters = rallyingPoints.Select(r => new
    {
      id = r.Id,
      location = new Point(new Position(r.Location.Lat, r.Location.Lng)),
      label = r.Label,
      type = r.Type,
      address = r.Address,
      zip_code = r.ZipCode,
      city = r.City,
      place_count = r.PlaceCount,
      is_active = r.IsActive,
    }).ToList();
    await connection.ExecuteAsync(
      "INSERT INTO rallying_point (id, location, label, type, address, zip_code, city, place_count, is_active) VALUES (@id, @location, @label, @type, @address, @zip_code, @city, @place_count, @is_active) ON CONFLICT DO NOTHING",
      parameters);
  }

  public async Task<ImmutableList<LianeMatchCandidate>> GetMatchingLianes(Route targetRoute, DateTime from, DateTime to)
  {
    using var connection = db.NewConnection();
    var results = await connection.QueryAsync("SELECT liane_id, st_AsGeoJSON(pickup) as pickup, st_AsGeoJSON(deposit) as deposit, l_start, l_end, mode FROM match_liane(@route::geometry(LineString, 4326), @from::timestamp, @to::timestamp)", new {from, to, route = targetRoute.Coordinates.ToLineString()});
    var candidates = results.Select(r =>
    {
      var dict = (r as IDictionary<string, object>)!;

      Enum.TryParse(typeof(MatchResultMode),((string)dict["mode"]).Capitalize(), false, out var mode);
      var pickup = JsonSerializer.Deserialize<Point>((string)dict["pickup"])!;
      var deposit = JsonSerializer.Deserialize<Point>((string)dict["deposit"])!;
      return new LianeMatchCandidate((string)dict["liane_id"], LatLngExtensions.FromGeoJson(pickup), LatLngExtensions.FromGeoJson(deposit), (double)dict["l_start"], (double)dict["l_end"],
       (MatchResultMode) mode! );
    });
    return candidates.ToImmutableList();
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