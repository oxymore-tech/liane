using System;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Service.Internal.User;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService
{
  private const int Version = 16;

  private readonly IMongoDatabase db;
  private readonly ILogger<MigrationService> logger;

  public MigrationService(IMongoDatabase db, ILogger<MigrationService> logger)
  {
    this.db = db;
    this.logger = logger;
  }

  private async Task Migrate()
  {
    await db.GetCollection<DbUser>()
      .UpdateManyAsync(Builders<DbUser>.Filter.Empty, Builders<DbUser>.Update.Unset("tripsCount").Set("stats", new UserStats()));
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