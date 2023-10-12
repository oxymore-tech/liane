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
using Liane.Service.Internal.Postgis;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeStatusUpdate : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly INotificationService notificationService;
  private readonly IPostgisService postgisService;
  private readonly ILianeService lianeService;
  private readonly ILianeUpdateObserver lianeUpdateObserver;
  
  private const int StartedDelayInMinutes = 5;
  private const int FinishedDelayInMinutes = 5;

  public LianeStatusUpdate(ILogger<LianeStatusUpdate> logger, IMongoDatabase mongo, INotificationService notificationService,
    IPostgisService postgisService, ILianeService lianeService, ILianeUpdateObserver lianeUpdateObserver) : base(logger, "* * * * *",
    false)
  {
    this.mongo = mongo;
    this.notificationService = notificationService;
    this.postgisService = postgisService;
    this.lianeService = lianeService;
    this.lianeUpdateObserver = lianeUpdateObserver;
  }

  protected override Task DoWork(CancellationToken cancellationToken) => Update(DateTime.UtcNow);

  public async Task Update(DateTime from)
  {
    await CancelLianes(from);
    await StartLianes(from);
    await FinishLianes(from);
    await RealtimeUpdate(from);
  }

  private async Task CancelLianes(DateTime from)
  {
    var limit = from; //.AddMinutes(StartedDelayInMinutes);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted && (l.Members.Count == 1 || !l.Driver.CanDrive))
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta <= limit);
    var canceled = (await mongo.GetCollection<LianeDb>()
        .Find(filter)
        .Project(l => (Ref<Api.Trip.Liane>)l.Id)
        .ToListAsync())
      .ToImmutableHashSet();
    
    await Parallel.ForEachAsync(canceled, async (id, _) =>
    {
      await lianeService.UpdateState(id, LianeState.Canceled);
    });
    await postgisService.Clear(canceled.ToImmutableList());
    await notificationService.CleanJoinLianeRequests(canceled);
  }

  private async Task FinishLianes(DateTime from)
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

    // TODO remove 
    await notificationService.CleanNotifications(finishedLianes.Select(l => (Ref<Api.Trip.Liane>)l.Id).ToImmutableList());
    
    await Parallel.ForEachAsync(finishedLianes, async (lianeDb, token) =>
    {
      if (token.IsCancellationRequested) return;
      await lianeService.UpdateState(lianeDb.Id, LianeState.Finished);
    });
    await postgisService.Clear(finishedLianes.Select(l => (Ref<Api.Trip.Liane>)l.Id).ToImmutableList());
  }

  private async Task StartLianes(DateTime from)
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

    await Parallel.ForEachAsync(activeLianes, async (lianeDb, token) =>
    {
      if (token.IsCancellationRequested) return;
      await lianeService.UpdateState(lianeDb.Id, LianeState.Started);
    });
    
    // TODO create ongoing trip here ?
    var toClear = activeLianes.Select(l => (Ref<Api.Trip.Liane>)l.Id).ToImmutableHashSet();
    await postgisService.Clear(toClear);
    await notificationService.CleanJoinLianeRequests(toClear);
  }

  private async Task RealtimeUpdate(DateTime from)
  {
    var limit = from.AddMinutes(StartedDelayInMinutes);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > from && w.Eta <= limit);
    var withStartingSoonWaypoint = await mongo.GetCollection<LianeDb>()
      .Find(filter)
      .ToListAsync();
    await Parallel.ForEachAsync(withStartingSoonWaypoint, async (liane, token) =>
    {
      if (token.IsCancellationRequested) return;
      foreach (var lianeMember in liane.Members)
      {
        var resolved = await lianeService.GetForCurrentUser(liane.Id, lianeMember.User);
        await lianeUpdateObserver.Push(resolved, lianeMember.User);
      }
    });
  }
  
  public static LianeState GetUserState(Api.Trip.Liane liane, LianeMember member)
  {
    var current = liane.State;
    if (current == LianeState.Started)
    {
      var pickupPoint = liane.WayPoints.Find(w => w.RallyingPoint.Id! == member.From);
      if (pickupPoint!.Eta > DateTime.UtcNow.AddMinutes(StartedDelayInMinutes)) return LianeState.NotStarted;
      // TODO get finished state from pings ?
      /*
       var depositPoint = liane.WayPoints.Find(w => w.RallyingPoint.Id == member.To);
       if (depositPoint!.Eta < DateTime.UtcNow) return LianeState.Finished;
      */
    }
     
    // Final states
    if (current == LianeState.Finished && member.Feedback is not null)
    {
      return member.Feedback.Canceled ? LianeState.Canceled : LianeState.Archived;
    }

    return current;
  }

}
