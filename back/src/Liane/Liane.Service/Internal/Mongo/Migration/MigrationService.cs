using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService
{
  const int Version = 1;

  private readonly IMongoDatabase db;
  private readonly ILianeService lianeService;
  private readonly ILogger<MigrationService> logger;

  public MigrationService(IMongoDatabase db, ILianeService lianeService, ILogger<MigrationService> logger)
  {
    this.db = db;
    this.lianeService = lianeService;
    this.logger = logger;
  }

  public async Task Execute()
  {
    var schemaVersion = await db.GetCollection<SchemaVersion>()
      .Find(v => v.Version == Version)
      .FirstOrDefaultAsync();
    if (schemaVersion is not null)
    {
      return;
    }

    logger.LogInformation("Start migration {Version}", Version);
    await db.GetCollection<LianeDb>()
      .UpdateManyAsync(FilterDefinition<LianeDb>.Empty, Builders<LianeDb>.Update.Unset(l => l.Geometry));

    await lianeService.UpdateAllGeometries();
    await db.GetCollection<SchemaVersion>()
      .InsertOneAsync(new SchemaVersion(Version, DateTime.Now));
    logger.LogInformation("Migration {Version} done", Version);
  }
}