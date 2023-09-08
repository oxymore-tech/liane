using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Util;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberPingHandler : IEventListener<LianeEvent.MemberPing>
{
  private readonly IMongoDatabase mongo;
  private readonly ILianeMemberTracker lianeMemberTracker;
  private readonly ConcurrentDictionary<string, Task<LianeTracker>> trackers = new();
  private readonly ILianeService lianeService;
  private readonly ICurrentContext currentContext;
  private readonly IOsrmService osrmService;
  private readonly IPostgisService postgisService;
  public LianeMemberPingHandler(IMongoDatabase db, ILianeMemberTracker lianeMemberTracker, ILianeService lianeService, ICurrentContext currentContext, IOsrmService osrmService, IPostgisService postgisService)
  {
    mongo = db;
    this.lianeMemberTracker = lianeMemberTracker;
    this.lianeService = lianeService;
    this.currentContext = currentContext;
    this.osrmService = osrmService;
    this.postgisService = postgisService;
  }

  private async Task EndTrip(Ref<Api.Trip.Liane> liane)
  {
    await lianeService.UpdateState(liane.Id, LianeState.Finished);
    trackers.TryRemove(liane.Id, out _);
  }

  public async Task OnEvent(LianeEvent.MemberPing e, Ref<Api.User.User>? sender = null)
  {
    var at = DateTimeOffset.FromUnixTimeMilliseconds(e.Timestamp).UtcDateTime;
    var memberId = sender ?? currentContext.CurrentUser().Id;
    var ping = new UserPing(memberId, at, e.Delay ?? TimeSpan.Zero, e.Coordinate);
    var filter = Builders<LianeDb>.Filter.Where(l => l.Id == e.Liane)
                 & Builders<LianeDb>.Filter.Or(Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, DateTime.UtcNow + TimeSpan.FromMinutes(15)),
                       Builders<LianeDb>.Filter.Where(l => l.State == LianeState.Started))
                    & Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == memberId);

    var liane = await mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync(filter,
        Builders<LianeDb>.Update.AddToSet(l => l.Pings, ping),
        new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After }
      );

    if (liane is null)
    {
      return;
    }

    if (liane.State == LianeState.NotStarted && e.Coordinate is not null)
    {
      // First location ping -> go to started state
      // TODO -> or start ony at first driver's ping ?
      await lianeService.UpdateState(e.Liane, LianeState.Started);
      liane = liane with { State = LianeState.Started };
    }

    var tracker = await trackers.GetOrAdd(liane.Id, async _ =>
    {
      var l = await lianeService.Get(liane.Id);
      return await new LianeTracker.Builder(l)
        .SetTripArrivedDestinationCallback(() =>
        {
          // Wait 5 minutes then go to "finished" state 
          Task.Delay(5 * 60 * 1000)
            .ContinueWith(_ => EndTrip(liane.Id))
            .Start();
        })
        .SetAutoDisposeTimeout(() => EndTrip(liane.Id)
        , 3600 * 1000)
        .Build(osrmService, postgisService, mongo);
    });
    
    await tracker.Push(ping);

    // For now we only share position of the driver, and passengers close to the next pickup point
    if (memberId  == liane.Driver.User.Id)
    {
      var currentLocation = tracker.GetCurrentMemberLocation(memberId);
      if (currentLocation is not null) await lianeMemberTracker.Push(currentLocation);
    } else // disable for now : if (tracker.IsCloseToPickup(memberId))
    {
      var currentLocation = tracker.GetCurrentMemberLocation(memberId);
      if (currentLocation is not null) await lianeMemberTracker.Push(currentLocation);
    }
  }

}