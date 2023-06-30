using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Postgis;

public sealed class PostgisUpdateService
{
  private readonly IMongoDatabase mongo;
  private readonly IPostgisService postgisService;
  private readonly ILogger<PostgisUpdateService> logger;
  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly PostgisDatabase postgis;

  public PostgisUpdateService(IMongoDatabase mongo, PostgisDatabase postgis, ILogger<PostgisUpdateService> logger, IPostgisService postgisService, IRoutingService routingService,
    IRallyingPointService rallyingPointService)
  {
    this.mongo = mongo;
    this.postgisService = postgisService;
    this.routingService = routingService;
    this.rallyingPointService = rallyingPointService;
    this.logger = logger;
    this.postgis = postgis;
  }

  private async Task Migrate()
  {
    await PostgisFactory.UpdateSchema(postgis);
    await postgisService.UpdateGeometry(ComputeGeometry);
  }

  public async Task Execute()
  {
    logger.LogInformation("Start postgis update");
    await Migrate();
    logger.LogInformation("Postgis update done");
  }

  private async Task<BatchGeometryUpdate> ComputeGeometry(BatchGeometryUpdateInput input)
  {
    var wayPoints = new List<LianeWayPointDb>();
    var segments = new List<SegmentDb>();

    var lianeDbs = await mongo.GetCollection<LianeDb>()
      .Find(l => l.State == LianeState.NotStarted && !input.Lianes.Contains(l.Id))
      .ToListAsync();

    logger.LogInformation("Start adding {lianes} lianes into postgis", lianeDbs.Count);

    var index = 0;
    foreach (var lianeDb in lianeDbs)
    {
      var rallyingPoints = await lianeDb.WayPoints.SelectAsync(w => rallyingPointService.Get(w.RallyingPoint));
      for (var i = 0; i < rallyingPoints.Count - 1; i++)
      {
        var from = rallyingPoints[i];
        var to = rallyingPoints[i + 1];
        if (input.Segments.Add((from.Id!, to.Id!)))
        {
          var route = await routingService.GetRoute(from.Location, to.Location);
          segments.Add(new SegmentDb(from.Id!, to.Id!, route.Coordinates.ToLineString()));
        }

        wayPoints.Add(new LianeWayPointDb(from.Id!, to.Id!, lianeDb.Id, lianeDb.WayPoints[i].Eta));
        logger.LogInformation("Adding liane {index}/{to}", index++, lianeDbs.Count);
      }
    }

    return new BatchGeometryUpdate(segments, wayPoints);
  }
}