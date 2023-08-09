using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberPingHandler : IEventListener<LianeEvent.MemberPing>
{
  private readonly IMongoDatabase mongo;
  private readonly ILianeMemberTracker lianeMemberTracker;
  private readonly ConcurrentDictionary<string, Task<LianeTracker>> trackers = new();
  private readonly ILianeService lianeService;
  private readonly IServiceProvider serviceProvider;
  private readonly ICurrentContext currentContext;
  public LianeMemberPingHandler(IMongoDatabase db, ILianeMemberTracker lianeMemberTracker, ILianeService lianeService, IServiceProvider serviceProvider, ICurrentContext currentContext)
  {
    mongo = db;
    this.lianeMemberTracker = lianeMemberTracker;
    this.lianeService = lianeService;
    this.serviceProvider = serviceProvider;
    this.currentContext = currentContext;
  }

  public async Task OnEvent(LianeEvent.MemberPing e, Ref<Api.User.User>? sender = null)
  {
    var at = DateTimeOffset.FromUnixTimeMilliseconds(e.Timestamp).DateTime.ToUniversalTime();
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
      await lianeService.UpdateState(e.Liane, LianeState.Started);
      liane = liane with { State = LianeState.Started };
    }

    var tracker = await trackers.GetOrAdd(liane.Id, async _ =>
    {
      var l = await lianeService.Get(liane.Id);
      return new LianeTracker(serviceProvider, l, () =>
      {
        // TODO go to "finished" state if driver pings close to arrival
        return Task.CompletedTask;
      });
    });
    await tracker.Push(ping);

    // For now we only share position of the driver, and passengers close to the next pickup point
    if (memberId  == liane.Driver.User.Id)
    {
      var currentLocation = tracker.GetCurrentMemberLocation(memberId);
      if (currentLocation is not null) await lianeMemberTracker.Push(currentLocation);
    } else if (tracker.IsCloseToPickup(memberId))
    {
      var currentLocation = tracker.GetCurrentMemberLocation(memberId);
      if (currentLocation is not null) await lianeMemberTracker.Push(currentLocation);
    }
  }

}


public sealed class LianeTracker
{
  const double NearPointDistanceInMeters = 500;
  const double NearPointTimeSpanInMinutes = 5 ;
  private readonly Api.Trip.Liane liane;
  private readonly ConcurrentDictionary<string, (DateTime At, int NextPointIndex, TimeSpan Delay, LatLng? Coordinate,  LatLng? RawCoordinate,  double PointDistance)?> currentLocationMap = new();
  private readonly Func<Task> onTripArrivedDestination;
  private readonly IOsrmService osrmService; 
  public LianeTracker(IServiceProvider serviceProvider, Api.Trip.Liane liane, Func<Task> onTripArrivedDestination)
  {
    this.liane = liane;
    this.onTripArrivedDestination = onTripArrivedDestination;
    osrmService =  serviceProvider.GetRequiredService<IOsrmService>();
 
  }


  private int GetFirstPoint(Ref<Api.User.User> user)
  {
    var member = liane.Members.First(m => m.User.Id == user.Id);
    return liane.WayPoints.FindIndex(w => w.RallyingPoint.Id == member.From.Id);
  }

  private bool IsWithinWayPointRange(double distance)
  {
    // For now consider in range if signal is within 25 meters 
    return distance <= 25;
  }
  public async Task Push(UserPing ping)
  {
  //  await init;
    var now = DateTime.UtcNow;

    currentLocationMap.TryGetValue(ping.User.Id, out var currentLocation);
    var nextPointIndex = currentLocation?.NextPointIndex ?? GetFirstPoint(ping.User.Id);

    if (ping.Coordinate is null)
    {
      currentLocationMap[ping.User.Id] = (ping.At, nextPointIndex, ping.Delay, null, null, double.PositiveInfinity);
      return;
    }
 
    // Snap coordinate to nearest road segment
    var nextPoint = liane.WayPoints[nextPointIndex].RallyingPoint;
    var nextPointDistance = ping.Coordinate.Value.Distance(nextPoint.Location);
    var wayPointInRange = IsWithinWayPointRange(nextPointDistance);
    var pingNextPointIndex = nextPointIndex;
    if (wayPointInRange)
    {
      // Send raw coordinate
      if (nextPointIndex == liane.WayPoints.Count - 1 && ping.User.Id == liane.Driver.User.Id)
      {
        // Driver arrived near destination point
        await onTripArrivedDestination();
      }
      currentLocationMap[ping.User.Id] = (ping.At, pingNextPointIndex, ping.Delay, ping.Coordinate.Value, ping.Coordinate.Value,nextPointDistance);
      return;
    }
    else if (currentLocation is not null && IsWithinWayPointRange(currentLocation.Value.PointDistance))
    {
      // Getting out of a way point zone
      pingNextPointIndex++;
    }
    var coordinate = (await osrmService.Nearest(ping.Coordinate.Value)) ?? ping.Coordinate.Value;
    var table = await osrmService.Table(new List<LatLng> { coordinate, nextPoint.Location });
    var estimatedDuration = TimeSpan.FromSeconds(table.Durations[0][1]!.Value);
    var delay = now + estimatedDuration - liane.WayPoints.First(w => w.RallyingPoint.Id == nextPoint.Id).Eta + ping.Delay;
   
    currentLocationMap[ping.User.Id] = (ping.At, pingNextPointIndex, delay, coordinate, ping.Coordinate.Value, nextPointDistance);
    
  }

  public bool IsCloseToPickup(Ref<Api.User.User> member)
  {
    currentLocationMap.TryGetValue(member.Id, out var memberCurrentLocation);
    currentLocationMap.TryGetValue(liane.Driver.User.Id, out var driverCurrentLocation);
    if (driverCurrentLocation is null || memberCurrentLocation is null) return false;
    var lianeMember = liane.Members.First(m => m.User.Id == member.Id);
    return memberCurrentLocation.Value.NextPointIndex == driverCurrentLocation.Value.NextPointIndex 
           && lianeMember.From.Id == liane.WayPoints[driverCurrentLocation.Value.NextPointIndex].RallyingPoint.Id
           && (memberCurrentLocation.Value.PointDistance < NearPointDistanceInMeters || liane.WayPoints[driverCurrentLocation.Value.NextPointIndex].Eta - DateTime.Now < TimeSpan.FromMinutes(NearPointTimeSpanInMinutes));
  }

  public TrackedMemberLocation? GetCurrentMemberLocation(Ref<Api.User.User> member)
  {
    currentLocationMap.TryGetValue(member.Id, out var currentLocation);
    if (currentLocation is null) return null;
    
    return new TrackedMemberLocation(member, liane, currentLocation.Value.At, liane.WayPoints[currentLocation.Value.NextPointIndex].RallyingPoint, (long)currentLocation.Value.Delay.TotalSeconds, currentLocation.Value.Coordinate);
  }
}