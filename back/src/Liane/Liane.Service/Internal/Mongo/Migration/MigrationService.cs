using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Service.Internal.Trip;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed class MigrationService(IMongoDatabase db, ILogger<MigrationService> logger)
{
  private const int Version = 17;

  private async Task Migrate()
  {
    await db.RenameCollectionAsync("liane", "trip");
    await db.RenameCollectionAsync("liane_recurrence", "trip_recurrence");
    await db.RenameCollectionAsync("liane_track_report", "trip_track_report");
    await db.GetCollection<Notification>("notification")
      .UpdateManyAsync(FilterDefinition<Notification>.Empty,
        Builders<Notification>.Update.Rename("payload.liane", "payload.trip")
      );
    await db.GetCollection<DetailedTripTrackReportDb>("trip_track_report")
      .UpdateManyAsync(FilterDefinition<DetailedTripTrackReportDb>.Empty,
        Builders<DetailedTripTrackReportDb>.Update.Rename("liane", "trip")
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