using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Postgis;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeStatusUpdate : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly INotificationService notificationService;
  private readonly IPostgisService postgisService;

  private const int StartedDelayInMinutes = 5;
  private const int FinishedDelayInMinutes = 60;

  public LianeStatusUpdate(ILogger<LianeStatusUpdate> logger, IMongoDatabase mongo, INotificationService notificationService,
    IPostgisService postgisService) : base(logger, "* * * * *",
    false)
  {
    this.mongo = mongo;
    this.notificationService = notificationService;
    this.postgisService = postgisService;
  }

  protected override Task DoWork(CancellationToken cancellationToken) => Update(DateTime.UtcNow);

  public async Task Update(DateTime from)
  {
    await UpdateCanceledLianes(from);
    await UpdateActiveLianes(from);
    await UpdateFinishedLianes(from);
  }

  private async Task UpdateCanceledLianes(DateTime from)
  {
    var limit = from.AddMinutes(StartedDelayInMinutes);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted && (l.Members.Count == 1 || !l.Driver.CanDrive))
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta <= limit);
    var canceled = (await mongo.GetCollection<LianeDb>()
        .Find(filter)
        .Project(l => l.Id)
        .ToListAsync())
      .ToImmutableHashSet();

    await mongo.GetCollection<LianeDb>()
      .UpdateManyAsync(l => canceled.Contains(l.Id),
        Builders<LianeDb>.Update.Set(l => l.State, LianeState.Canceled));

    await postgisService.Clear(canceled.ToImmutableList());
  }

  private async Task UpdateFinishedLianes(DateTime from)
  {
    var limit = from.AddMinutes(- FinishedDelayInMinutes);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted || l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.Where(l => l.Members.Count > 1 && l.Driver.CanDrive)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta < limit);
    var lianes = await mongo.GetCollection<LianeDb>()
      .Find(filter)
      .ToListAsync();

    var finishedLianes = lianes
      .Where(l => l.WayPoints.Last().Eta < limit)
      .ToImmutableList();

    if (finishedLianes.IsEmpty)
    {
      return;
    }

    await notificationService.CleanNotifications(finishedLianes.Select(l => (Ref<Api.Trip.Liane>)l.Id).ToImmutableList());

    await mongo.GetCollection<LianeDb>()
      .BulkWriteAsync(finishedLianes
        .Select(liane => new UpdateOneModel<LianeDb>(
          Builders<LianeDb>.Filter.Where(l => l.Id == liane.Id),
          Builders<LianeDb>.Update.Set(l => l.State, LianeState.Finished))
        ));

    await postgisService.Clear(finishedLianes.Select(l => l.Id).ToImmutableList());
  }

  private async Task UpdateActiveLianes(DateTime from)
  {
    var limit = from.AddMinutes(StartedDelayInMinutes);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted)
                 & Builders<LianeDb>.Filter.Where(l => l.Members.Count > 1 && l.Driver.CanDrive)
                 & (
                   Builders<LianeDb>.Filter.Where(l => l.DepartureTime <= limit)
                   & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > from)
                   );
    var activeLianes = await mongo.GetCollection<LianeDb>()
      .Find(filter)
      .ToListAsync();

    if (activeLianes.Count == 0)
    {
      return;
    }

    await mongo.GetCollection<LianeDb>()
      .BulkWriteAsync(activeLianes
        .Select(liane => new UpdateOneModel<LianeDb>(
          Builders<LianeDb>.Filter.Where(l => l.Id == liane.Id),
          Builders<LianeDb>.Update.Set(l => l.State, LianeState.Started))
        ));

    // TODO create ongoing trip here ?
    await postgisService.Clear(activeLianes.Select(l => l.Id).ToImmutableList());
  }

}
  
