using System;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService
{
  private const int Version = 6;

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
    await db.GetCollection<BsonDocument>("notification").UpdateManyAsync(f => true, Builders<BsonDocument>.Update.Rename("sentAt", "createdAt"));
    await db.GetCollection<BsonDocument>("notification").UpdateManyAsync(f => true, Builders<BsonDocument>.Update.Rename("sender", "createdBy"));

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