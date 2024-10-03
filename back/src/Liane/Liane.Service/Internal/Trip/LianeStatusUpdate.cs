using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeStatusUpdate : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly ITripService tripService;
  private readonly ILianeUpdateObserver lianeUpdateObserver;
  private readonly ILianeRequestService lianeRequestService;

  private const int StartedDelayInMinutes = 5;
  public const int FinishedDelayInMinutes = 5;
  public const int StartedTimeoutInMinutes = 60;

  public LianeStatusUpdate(ILogger<LianeStatusUpdate> logger, IMongoDatabase mongo, ITripService tripService,
    ILianeUpdateObserver lianeUpdateObserver, ILianeRequestService lianeRequestService) : base(logger, "* * * * *",
    false)
  {
    this.mongo = mongo;
    this.tripService = tripService;
    this.lianeUpdateObserver = lianeUpdateObserver;
    this.lianeRequestService = lianeRequestService;
  }

  protected override Task DoWork(CancellationToken cancellationToken) => Update(DateTime.UtcNow);

  public async Task Update(DateTime from)
  {
    await CancelLianes(from);
    //await StartLianes(from);
    await FinishLianes(from);
    //await RealtimeUpdate(from);
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
    //await postgisService.Clear(canceled.ToImmutableList());
    await lianeRequestService.RejectJoinLianeRequests(canceled);
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
    ;
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

  private async Task StartLianes(DateTime from)
  {
    var limit = from.AddMinutes(StartedDelayInMinutes);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == TripStatus.NotStarted)
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

    await Parallel.ForEachAsync(activeLianes, async (lianeDb, token) =>
    {
      if (token.IsCancellationRequested) return;
      await tripService.UpdateState(lianeDb.Id, TripStatus.Started);
    });

    // TODO create ongoing trip here ?
    var toClear = activeLianes.Select(l => (Ref<Api.Trip.Trip>)l.Id).ToImmutableHashSet();
    //await postgisService.Clear(toClear);
    await lianeRequestService.RejectJoinLianeRequests(toClear);
  }

  private async Task RealtimeUpdate(DateTime from)
  {
    var limit = from.AddMinutes(StartedDelayInMinutes);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == TripStatus.Started)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > from && w.Eta <= limit);
    var withStartingSoonWaypoint = await mongo.GetCollection<LianeDb>()
      .Find(filter)
      .ToListAsync();
    await Parallel.ForEachAsync(withStartingSoonWaypoint, async (liane, token) =>
    {
      if (token.IsCancellationRequested) return;
      foreach (var lianeMember in liane.Members)
      {
        var resolved = await tripService.GetForCurrentUser(liane.Id, lianeMember.User);
        await lianeUpdateObserver.Push(resolved, lianeMember.User);
      }
    });
  }
}