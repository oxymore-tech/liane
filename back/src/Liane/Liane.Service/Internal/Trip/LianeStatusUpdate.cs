using System;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeStatusUpdate(ILogger<LianeStatusUpdate> logger, IMongoDatabase mongo, ITripService tripService)
  : CronJobService(logger, "* * * * *", false)
{
  public const int FinishedDelayInMinutes = 5;
  private const int StartedTimeoutInMinutes = 60;

  protected override Task DoWork(CancellationToken cancellationToken) => Update(DateTime.UtcNow);

  public async Task Update(DateTime from)
  {
    await CancelLianes(from);
    await FinishLianes(from);
  }

  private async Task CancelLianes(DateTime from)
  {
    var limit = from;
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == TripStatus.NotStarted && (l.Members.Count == 1 || !l.Driver.CanDrive))
                 & !Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > limit);
    var canceled = (await mongo.GetCollection<LianeDb>()
        .Find(filter)
        .Project(l => (Ref<Api.Trip.Trip>)l.Id)
        .ToListAsync())
      .ToImmutableHashSet();

    await Parallel.ForEachAsync(canceled, async (id, _) => { await tripService.UpdateState(id, TripStatus.Canceled); });
  }

  private async Task FinishLianes(DateTime from)
  {
    var limitNotStarted = from.AddMinutes(-FinishedDelayInMinutes);
    var limitStarted = from.AddMinutes(-StartedTimeoutInMinutes);
    var filterNotStarted = Builders<LianeDb>.Filter.Where(l => l.State == TripStatus.NotStarted)
                           & Builders<LianeDb>.Filter.Where(l => l.Members.Count > 1 && l.Driver.CanDrive)
                           & !Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > limitNotStarted);
    var filterTimedOut = Builders<LianeDb>.Filter.Where(l => l.State == TripStatus.Started)
                         & !Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > limitStarted)
                         & !Builders<LianeDb>.Filter.ElemMatch(l => l.Pings, w => w.At > limitStarted);

    var finishedLianes = await mongo.GetCollection<LianeDb>()
      .Find(filterNotStarted | filterTimedOut)
      .ToListAsync();

    if (finishedLianes.Count == 0)
    {
      return;
    }

    await Parallel.ForEachAsync(finishedLianes, async (lianeDb, token) =>
    {
      if (token.IsCancellationRequested) return;
      await tripService.UpdateState(lianeDb.Id, TripStatus.Finished);
    });
  }
}