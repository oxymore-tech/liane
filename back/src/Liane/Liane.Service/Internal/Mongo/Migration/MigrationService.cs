using System;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService
{
  private const int Version = 3;

  private readonly IMongoDatabase db;
  private readonly ILogger<MigrationService> logger;
  private readonly ILianeService lianeService;

  public MigrationService(IMongoDatabase db, ILogger<MigrationService> logger, ILianeService lianeService)
  {
    this.db = db;
    this.logger = logger;
    this.lianeService = lianeService;
  }

  private async Task Migrate()
  {
    await db.GetCollection<LianeDb>()
      .UpdateManyAsync(l => l.State == LianeState.NotStarted && l.DepartureTime < DateTime.UtcNow,
        Builders<LianeDb>.Update.Set(l => l.State, LianeState.Canceled)
      );

    await lianeService.UpdateAllGeometries();
  }

  public async Task Execute()
  {
    var schemaVersion = await db.GetCollection<SchemaVersion>()
      .Find(v => v.Id == Version)
      .FirstOrDefaultAsync();
    if (schemaVersion is not null)
    {
      return;
    }

    logger.LogInformation("Start migration {Version}", Version);
    await Migrate();

    await db.GetCollection<SchemaVersion>()
      .InsertOneAsync(new SchemaVersion(Version, DateTime.UtcNow));
    logger.LogInformation("Migration {Version} done", Version);
  }
}