using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;
using Liane.Api.Event;
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
  private readonly ILianeService lianeService;
  private readonly IOsrmService osrmService;
  private readonly IPostgisService postgisService;
  private readonly IMongoDatabase mongo;
  private readonly ILogger<LianeTrackerServiceImpl> logger;
  private readonly ILianeUpdatePushService lianeUpdatePushService;
  private readonly Timer timer = new(interval: 2 * 60 * 1000);

  public LianeTrackerServiceImpl(LianeTrackerCache trackerCache, ILianeService lianeService, ILogger<LianeTrackerServiceImpl> logger, IPostgisService postgisService, IOsrmService osrmService, IMongoDatabase mongo, ILianeUpdatePushService tracker)
  {
    this.trackerCache = trackerCache;
    this.lianeService = lianeService;
    this.logger = logger;
    this.postgisService = postgisService;
    this.osrmService = osrmService;
    this.mongo = mongo;
    this.lianeUpdatePushService = tracker;
    timer.Elapsed += (source, e) =>
    {
      // TODO for each liane
      foreach (var tracker in trackerCache.Trackers.Values)
      {
        foreach (var member in tracker.Liane.Members)
        {
          PublishLocation(tracker, member.User.Id).ConfigureAwait(false).GetAwaiter().GetResult();
        }
      }

      
    };
  }
  
  public async Task Start(Api.Trip.Liane liane)
  {
    // Create liane tracker
    var route = await osrmService.Route(liane.WayPoints.Select(w => w.RallyingPoint.Location));
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

    var tracker = new LianeTracker(tripSession, liane, () =>
    {
      // Wait 5 minutes then go to "finished" state
      Task.Delay(LianeStatusUpdate.FinishedDelayInMinutes * 60 * 1000)
        .ContinueWith(async _ =>
        {
          logger.LogInformation($"Liane {liane.Id} is now Finished");
          await UpdateState(liane.Id, LianeState.Finished);
        })
        .Start();
    });

    trackerCache.Trackers.TryAdd(liane.Id, tracker);
  }
  
  public async Task PushPing(Ref<Api.Trip.Liane> liane, UserPing ping)
  {
    var tracker = trackerCache.Trackers[liane];
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
          finished = true;
          onTripArrivedDestination();
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

    await PublishLocation(tracker, ping.User.Id);
  }

  private async Task PublishLocation(LianeTracker tracker, string userId)
  {
    // For now share all positions
    var currentLocation = tracker.GetCurrentMemberLocation(userId);
    if (currentLocation is not null)
    {
      var now = DateTime.UtcNow;
      var d = now - currentLocation.At;
      var isMoving = d > TimeSpan.FromMinutes(2);
      await lianeUpdatePushService.Push(currentLocation with { IsMoving = isMoving, At = isMoving ? currentLocation.At : now });
    }

    // TODO only share position of the driver, and passengers close to the next pickup point
  }

  
  

  
  private async Task InsertMemberLocation(LianeTracker tracker, Ref<Api.User.User> user, MemberLocationSample data)
  {
    tracker.InsertMemberLocation(user, data);

    await mongo.GetCollection<LianeTrackReport>()
      .FindOneAndUpdateAsync(r => r.Id == tracker.Liane.Id, Builders<LianeTrackReport>.Update.Push(r => r.MemberLocations, data));
  }
  
}