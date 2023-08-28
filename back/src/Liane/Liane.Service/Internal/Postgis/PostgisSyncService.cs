using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Postgis;

public sealed class PostgisSyncService
{
  private readonly ILogger<PostgisSyncService> logger;
  private readonly IPostgisService postgis;
  private readonly IMongoDatabase mongo;
  private readonly ILianeService lianeService;

  public PostgisSyncService(IPostgisService postgis, IMongoDatabase mongo, ILogger<PostgisSyncService> logger, ILianeService lianeService)
  {
    this.logger = logger;
    this.lianeService = lianeService;
    this.postgis = postgis;
    this.mongo = mongo;
  }
  

  public async Task Execute()
  {
    logger.Log(LogLevel.Information, "Start syncing databases...");
    var cursor = await mongo.GetCollection<LianeDb>().Find(l => l.State == LianeState.NotStarted).ToCursorAsync();
    await cursor.ForEachAsync(async l =>
    {
      await postgis.UpdateGeometry(await lianeService.Get(l.Id));
    });
    logger.Log(LogLevel.Information, "Syncing done.");

  }
}