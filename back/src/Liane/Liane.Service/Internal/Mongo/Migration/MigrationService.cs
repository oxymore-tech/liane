using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService
{
  private const int Version = 14;

  private readonly IMongoDatabase db;
  private readonly ILogger<MigrationService> logger;

  public MigrationService(IMongoDatabase db, ILogger<MigrationService> logger)
  {
    this.db = db;
    this.logger = logger;
  }

  private async Task Migrate()
  {
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.Started && (l.Members.Count == 1 || !l.Driver.CanDrive));
    await db.GetCollection<LianeDb>()
      .UpdateManyAsync(filter, Builders<LianeDb>.Update.Set(l => l.State, LianeState.Canceled));

    var immutableList = await db.GetCollection<LianeDb>()
      .Find(l => l.Recurrence != null)
      .Select(l => l.Recurrence!.Id);
    
    await db.GetCollection<LianeRecurrence>()
      .DeleteManyAsync(l => !immutableList.Contains(l.Id!));
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