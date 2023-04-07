using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService
{
  private const int Version = 2;

  private readonly IMongoDatabase db;
  private readonly ILogger<MigrationService> logger;

  public MigrationService(IMongoDatabase db, ILogger<MigrationService> logger)
  {
    this.db = db;
    this.logger = logger;
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
    await db.GetCollection<LianeDb>()
      .UpdateManyAsync(FilterDefinition<LianeDb>.Empty, Builders<LianeDb>.Update.Set(l => l.Status, new LianeStatus(LianeState.NotStarted, ImmutableList<UserPing>.Empty)));

    logger.LogInformation("Migration {Version} done", Version);
  }
}