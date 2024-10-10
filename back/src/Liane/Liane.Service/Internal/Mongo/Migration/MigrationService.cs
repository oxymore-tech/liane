using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService(IMongoDatabase db, ILogger<MigrationService> logger)
{
  private const int Version = 19;

  private async Task Migrate()
  {
    await db.GetCollection<LianeDb>()
      .DeleteManyAsync(Builders<LianeDb>.Filter.Empty);

    await db.DropCollectionAsync("notification");
    await db.DropCollectionAsync("liane_recurrence");
    await db.DropCollectionAsync("chat_message");
    await db.DropCollectionAsync("conversation_group");
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