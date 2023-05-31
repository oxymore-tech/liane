using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService
{
  private const int Version = 4;

  private readonly IMongoDatabase db;
  private readonly ILogger<MigrationService> logger;

  public MigrationService(IMongoDatabase db, ILogger<MigrationService> logger)
  {
    this.db = db;
    this.logger = logger;
  }

  private sealed record OldUserDb( string Id,
    bool IsAdmin,
    string Phone,
    string? RefreshToken,
    string? Salt,
    string? Pseudo,
    string? PushToken,
    DateTime? CreatedAt,
    DateTime? LastConnection,
    UserInfo? UserInfo = null
  ) : IIdentity;
  private async Task Migrate()
  {
    await db.DropCollectionAsync("event");

    await db.GetCollection<OldUserDb>("user")
      .UpdateManyAsync(l => true,
        Builders<OldUserDb>.Update.Unset(l => l.Pseudo )
      );

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