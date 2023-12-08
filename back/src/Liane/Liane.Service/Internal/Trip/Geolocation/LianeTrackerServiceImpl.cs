using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Geolocation;

public class LianeTrackerServiceImpl: ILianeTrackerService
{
  private readonly LianeTrackerCache trackerCache;

  private readonly IOsrmService osrmService;
  private readonly IPostgisService postgisService;
  private readonly IMongoDatabase mongo;
  private readonly ILogger<LianeTrackerServiceImpl> logger;
  private readonly ILianeUpdatePushService lianeUpdatePushService;
  private readonly Timer timer = new(interval: 2 * 60 * 1000);
  private readonly ConcurrentDictionary<string, Action?> onReachedDestinationActions = new();
  private readonly ILianeService lianeService;

  public LianeTrackerServiceImpl(LianeTrackerCache trackerCache, ILogger<LianeTrackerServiceImpl> logger, IPostgisService postgisService, IOsrmService osrmService, IMongoDatabase mongo, ILianeUpdatePushService lianeUpdatePushService, ILianeService lianeService)
  {
    this.trackerCache = trackerCache;
    this.logger = logger;
    this.postgisService = postgisService;
    this.osrmService = osrmService;
    this.mongo = mongo;
    this.lianeUpdatePushService = lianeUpdatePushService;
    this.lianeService = lianeService;
    timer.Elapsed += (_, _) =>
    {
      // TODO for each liane
      foreach (var tracker in trackerCache.Trackers)
      {
          PublishLocation(tracker).ConfigureAwait(false).GetAwaiter().GetResult();
      }

      
    };
  }
  
  public async Task<LianeTracker> Start(Api.Trip.Liane liane, Action? onReachedDestination = null)
  {
    onReachedDestinationActions[liane.Id] = onReachedDestination ?? GetDefaultOnReachedDestination(liane);
    return await trackerCache.GetOrAddTracker(liane.Id, async (_) =>
    {
      // Create liane tracker
      var route = await osrmService.Route(liane.WayPoints.Select(w => w.RallyingPoint.Location), overview: "full");
      var routeAsLineString = route.Routes[0].Geometry.Coordinates.ToLineString();
      var tripSession = await postgisService.CreateOngoingTrip(liane.Id, routeAsLineString);

      var previousReport = (await mongo.GetCollection<LianeTrackReport>().FindAsync(r => r.Id == liane.Id)).FirstOrDefault();
      if (previousReport is not null)
      {
        logger.LogInformation($"Using previously created report : {liane.Id}");
      }
      else
      {
        await mongo.GetCollection<LianeTrackReport>().InsertOneAsync(new LianeTrackReport(liane.Id, ImmutableList<MemberLocationSample>.Empty, DateTime.UtcNow));
      }

      return new LianeTracker(tripSession, liane);

    });
  }
  
  public async Task PushPing(Ref<Api.Trip.Liane> liane, UserPing ping)
  {
    var tracker = trackerCache.GetTracker(liane);
    if (tracker is null)
    {
      logger.LogWarning($"No tracker for liane = '{liane}'");
      return;
    }
    var pingTime = ping.At;

    var currentLocation = tracker.GetCurrentLocation(ping.User.Id);
    var nextPointIndex = currentLocation?.NextPointIndex ?? tracker.GetFirstWayPoint(ping.User.Id);
    
    if (ping.Coordinate is null)
    {
      await InsertMemberLocation(tracker, ping.User.Id, new(pingTime, nextPointIndex, ping.Delay, null, null, double.PositiveInfinity, ping.User));
      return;
    }

    // Snap coordinate to nearest road segment
    var locationOnRoute = await tracker.TripSession.LocateOnRoute(ping.Coordinate.Value);
    // If too far away from route, skip
    if (locationOnRoute.distance > ILianeTrackerService.NearPointDistanceInMeters)
    {
      var nextPoint = tracker.Liane.WayPoints[nextPointIndex].RallyingPoint;
      var nextPointDistance = ping.Coordinate.Value.Distance(nextPoint.Location);
      var computedLocation = await osrmService.Nearest(ping.Coordinate.Value) ?? ping.Coordinate.Value;
      var table = await osrmService.Table(new List<LatLng> { computedLocation, nextPoint.Location });
      var estimatedDuration = TimeSpan.FromSeconds(table.Durations[0][1]!.Value);
      var delay = estimatedDuration + ping.Delay;
      await InsertMemberLocation(tracker, ping.User.Id, new(pingTime, nextPointIndex, delay, computedLocation, ping.Coordinate.Value, nextPointDistance, ping.User));
    }
    else
    {
      var nextPoint = tracker.Liane.WayPoints[nextPointIndex].RallyingPoint;
      var nextPointDistance = ping.Coordinate.Value.Distance(nextPoint.Location);
      var wayPointInRange = nextPointDistance <= ILianeTrackerService.NearPointDistanceInMeters;
      var pingNextPointIndex = nextPointIndex;
      if (wayPointInRange)
      {
        // Send raw coordinate
        if (nextPointIndex == tracker.Liane.WayPoints.Count - 1 && ping.User == tracker.Liane.Driver.User)
        {
          // Driver arrived near destination point
          await mongo.GetCollection<LianeTrackReport>()
            .FindOneAndUpdateAsync(r => r.Id == tracker.Liane.Id, Builders<LianeTrackReport>.Update.Set(r => r.FinishedAt, DateTime.UtcNow));
          tracker.Finish();
          onReachedDestinationActions.TryGetValue(tracker.Liane.Id, out var callback);
          callback?.Invoke();

        }

        await InsertMemberLocation(tracker, ping.User.Id, new(pingTime, pingNextPointIndex, ping.Delay, ping.Coordinate.Value, ping.Coordinate.Value, nextPointDistance, ping.User));
        return;
      }
      else if (currentLocation is not null && currentLocation.PointDistance <= ILianeTrackerService.NearPointDistanceInMeters)
      {
        // Getting out of a way point zone
        pingNextPointIndex++;
      }
      else
      {
        // check point fraction 
        var nextPointFraction = await tracker.GetWayPointFraction(nextPointIndex);

        if (nextPointFraction < locationOnRoute.fraction)
        {
          // One or more waypoints were missed 
          pingNextPointIndex = await tracker.FindNextWayPointIndex(nextPointIndex + 1, locationOnRoute.fraction);
        }
      }

      var computedLocation = locationOnRoute.nearestPoint;
      var table = await osrmService.Table(new List<LatLng> { computedLocation, nextPoint.Location });
      var estimatedDuration = TimeSpan.FromSeconds(table.Durations[0][1]!.Value);
      var delay = estimatedDuration + ping.Delay;

      await InsertMemberLocation(tracker, ping.User.Id, new(pingTime, pingNextPointIndex, delay, computedLocation, ping.Coordinate.Value, nextPointDistance, ping.User));
    }

    await PublishLocation(tracker);
  }

  private async Task PublishLocation(LianeTracker tracker)
  {
    var info = tracker.GetTrackingInfo();
    foreach (var member in tracker.Liane.Members)
    {
      await lianeUpdatePushService.Push(info, member.User);
    }
  }

  public TrackingInfo? GetTrackingInfo(Ref<Api.Trip.Liane> liane)
  {
    var tracker = trackerCache.GetTracker(liane);
    return tracker?.GetTrackingInfo();
  }

  private Action GetDefaultOnReachedDestination(Ref<Api.Trip.Liane> liane)
  {
    return () =>
    {
      // Wait 5 minutes then go to "finished" state
      Task.Delay(LianeStatusUpdate.FinishedDelayInMinutes * 60 * 1000)
        .ContinueWith(async _ =>
        {
          logger.LogInformation($"Liane {liane.Id} is now Finished");
          await lianeService.UpdateState(liane.Id, LianeState.Finished);
        })
        .Start();
    };
  }
  
  public async Task SyncTrackers()
  {
    var started = await mongo.GetCollection<LianeDb>().Find(l => l.State == LianeState.Started).ToListAsync();
    foreach (var lianeDb in started)
    {
      var liane = await lianeService.Get(lianeDb.Id);
      await Start(liane);
    }
  }

  
  private async Task InsertMemberLocation(LianeTracker tracker, Ref<Api.User.User> user, MemberLocationSample data)
  {
    tracker.InsertMemberLocation(user, data);

    await mongo.GetCollection<LianeTrackReport>()
      .FindOneAndUpdateAsync(r => r.Id == tracker.Liane.Id, Builders<LianeTrackReport>.Update.Push(r => r.MemberLocations, data));
  }
  
}