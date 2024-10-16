using System;
using System.Threading.Tasks;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService(IMongoDatabase db, ILogger<MigrationService> logger)
{
  private const int Version = 20;

  private async Task Migrate()
  {
    await db.GetCollection<LianeDb>()
      .UpdateManyAsync(FilterDefinition<LianeDb>.Empty, Builders<LianeDb>.Update.Unset(l => l.Pings));
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