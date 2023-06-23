using System.Collections.Generic;
using System.Collections.Immutable;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Mongo.Migration;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Postgis;

public sealed class PostgisUpdateService
{
  private readonly IMongoDatabase mongo;
  private readonly PostgisDatabase postgis;
  private readonly ILogger<MigrationService> logger;
  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;

  public PostgisUpdateService(IMongoDatabase mongo, ILogger<MigrationService> logger, PostgisDatabase postgis, IRoutingService routingService,
    IRallyingPointService rallyingPointService)
  {
    this.mongo = mongo;
    this.postgis = postgis;
    this.routingService = routingService;
    this.rallyingPointService = rallyingPointService;
    this.logger = logger;
  }

  private async Task Migrate()
  {
    await UpdateFunction();
    await UpdateGeometry();
  }

  public async Task Execute()
  {
    logger.LogInformation("Start postgis update");
    await Migrate();
    logger.LogInformation("Postgis update done");
  }


  private async Task UpdateGeometry()
  {
    var lianes = await mongo.GetCollection<LianeDb>()
      .Find(l => l.Geometry != null)
      .ToListAsync();

    using var connection = postgis.NewConnection();
    using var tx = connection.BeginTransaction();
    var existing = (await connection.QueryAsync<string>("SELECT DISTINCT liane_id FROM liane_waypoint"))
      .ToImmutableHashSet();

    var lianeWaypoints = new List<LianeWayPointDb>();
    var segments = new List<SegmentDb>();
    var added = new HashSet<string>();
    var lianeDbs = lianes.Where(l => !existing.Contains(l.Id))
      .ToImmutableList();

    logger.LogInformation("Start adding {lianes} lianes into postgis", lianeDbs.Count);

    var index = 0;
    foreach (var lianeDb in lianeDbs)
    {
      var rallyingPoints = await lianeDb.WayPoints.SelectAsync(w => rallyingPointService.Get(w.RallyingPoint));
      for (var i = 0; i < rallyingPoints.Count - 1; i++)
      {
        var from = rallyingPoints[i];
        var to = rallyingPoints[i + 1];
        if (added.Add($"{from.Id!}-{to.Id!}"))
        {
          var route = await routingService.GetRoute(GetFromTo(from.Location, to.Location));
          segments.Add(new SegmentDb(from.Id!, to.Id!, route.Coordinates.ToLineString()));
        }

        lianeWaypoints.Add(new LianeWayPointDb(from.Id!, to.Id!, lianeDb.Id, lianeDb.WayPoints[i].Eta));
        logger.LogInformation("Adding liane {index}/{to}", index++, lianeDbs.Count);
      }
    }

    logger.LogInformation("Fetch {count} segments in postgis", segments.Count);
    var segmentsAdded = await connection.ExecuteAsync("INSERT INTO segment (from_id, to_id, geometry) VALUES (@from_id, @to_id, @geometry) ON CONFLICT DO NOTHING", segments);

    logger.LogInformation("Fetch {count} liane waypoints in postgis", lianeWaypoints.Count);
    var lianesAdded = await connection.ExecuteAsync("INSERT INTO liane_waypoint (from_id, to_id, liane_id, eta) VALUES (@from_id, @to_id, @liane_id, @eta)", lianeWaypoints);

    logger.LogInformation("Clear all orphan segments");
    var segmentsDeleted = await connection.ExecuteAsync("DELETE FROM segment WHERE ARRAY [from_id, to_id] NOT IN (SELECT ARRAY [from_id, to_id] FROM liane_waypoint)");

    tx.Commit();
    logger.LogInformation("Added {segmentsAdded} segments and {lianesAdded} lianes, deleted {segmentsDeleted} orphan segments", segmentsAdded, lianesAdded, segmentsDeleted);
  }

  private IEnumerable<LatLng> GetFromTo(LatLng fromLocation, LatLng toLocation)
  {
    yield return fromLocation;
    yield return toLocation;
  }

  private async Task UpdateFunction()
  {
    var assembly = typeof(PostgisUpdateService).Assembly;

    await using var stream = assembly.GetManifestResourceStream("Liane.Service.Resources.init.sql");
    if (stream is null)
    {
      throw new ResourceNotFoundException("Unable to find liane_display.sql");
    }

    using var reader = new StreamReader(stream);
    var sql = await reader.ReadToEndAsync();
    using var connection = postgis.NewConnection();
    await connection.ExecuteAsync(sql);
  }
}