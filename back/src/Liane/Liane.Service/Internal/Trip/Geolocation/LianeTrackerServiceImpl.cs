using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
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

public sealed class LianeTrackerServiceImpl : ILianeTrackerService
{
  private readonly LianeTrackerCache trackerCache;
  private readonly IOsrmService osrmService;
  private readonly IPostgisService postgisService;
  private readonly IMongoDatabase mongo;
  private readonly ILogger<LianeTrackerServiceImpl> logger;
  private readonly ILianeUpdatePushService lianeUpdatePushService;
  private readonly Timer timer = new(interval: 2 * 60 * 1000);
  private readonly ConcurrentDictionary<string, Action?> onReachedDestinationActions = new();
  private readonly ConcurrentDictionary<string, DateTime> lastCarMove = new();
  private readonly ITripService tripService;
  private readonly ICurrentContext currentContext;
  private readonly INotificationService notificationService;
  private const int StoppedDurationInMinutes = 15;

  public LianeTrackerServiceImpl(LianeTrackerCache trackerCache, ILogger<LianeTrackerServiceImpl> logger, IPostgisService postgisService, IOsrmService osrmService, IMongoDatabase mongo,
    ILianeUpdatePushService lianeUpdatePushService, ITripService tripService, ICurrentContext currentContext, INotificationService notificationService)
  {
    this.trackerCache = trackerCache;
    this.logger = logger;
    this.postgisService = postgisService;
    this.osrmService = osrmService;
    this.mongo = mongo;
    this.lianeUpdatePushService = lianeUpdatePushService;
    this.tripService = tripService;
    this.currentContext = currentContext;
    this.notificationService = notificationService;
    timer.Elapsed += (_, _) =>
    {
      foreach (var tracker in trackerCache.Trackers)
      {
        PublishLocation(tracker).ConfigureAwait(false).GetAwaiter().GetResult();
      }
    };
  }

  public async Task<LianeTracker> Start(Api.Trip.Trip trip, Action? onReachedDestination = null)
  {
    onReachedDestinationActions[trip.Id] = onReachedDestination ?? GetDefaultOnReachedDestination(trip);
    return await trackerCache.GetOrAddTracker(trip.Id, async _ =>
    {
      // Create liane tracker
      var route = await osrmService.Route(trip.WayPoints.Select(w => w.RallyingPoint.Location), overview: "full");
      var routeAsLineString = route.Routes[0].Geometry.Coordinates.ToLineString();
      var tripSession = await postgisService.CreateOngoingTrip(trip.Id, routeAsLineString);

      var previousReport = (await mongo.GetCollection<LianeTrackReport>().FindAsync(r => r.Id == trip.Id)).FirstOrDefault();
      if (previousReport is not null)
      {
        logger.LogInformation($"Using previously created report : {trip.Id}");
      }
      else
      {
        await mongo.GetCollection<LianeTrackReport>().InsertOneAsync(new LianeTrackReport(trip.Id, ImmutableList<MemberLocationSample>.Empty, ImmutableList<Car>.Empty, DateTime.UtcNow));
      }

      return new LianeTracker(tripSession, trip);
    });
  }

  private async Task PushPing(LianeTracker tracker, UserPing ping)
  {
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
      var nextPoint = tracker.Trip.GetWayPoint(nextPointIndex).RallyingPoint;
      var nextPointDistance = ping.Coordinate.Value.Distance(nextPoint.Location);
      var computedLocation = await osrmService.Nearest(ping.Coordinate.Value) ?? ping.Coordinate.Value;
      var table = await osrmService.Table(new List<LatLng> { computedLocation, nextPoint.Location });
      var estimatedDuration = TimeSpan.FromSeconds(table.Durations[0][1]!.Value);
      var delay = estimatedDuration + ping.Delay;
      await InsertMemberLocation(tracker, ping.User.Id, new(pingTime, nextPointIndex, delay, computedLocation, ping.Coordinate.Value, nextPointDistance, ping.User));
    }
    else
    {
      var nextPoint = tracker.Trip.GetWayPoint(nextPointIndex).RallyingPoint;
      var nextPointDistance = ping.Coordinate.Value.Distance(nextPoint.Location);
      var wayPointInRange = nextPointDistance <= ILianeTrackerService.NearPointDistanceInMeters;
      var pingNextPointIndex = nextPointIndex;
      if (wayPointInRange)
      {
        // Send raw coordinate
        if (nextPointIndex == tracker.Trip.WayPoints.Count - 1 && ping.User == tracker.Trip.Driver.User)
        {
          // Driver arrived near destination point
          tracker.Finish();
          await mongo.GetCollection<LianeTrackReport>()
            .FindOneAndUpdateAsync(r => r.Id == tracker.Trip.Id, Builders<LianeTrackReport>.Update.Set(r => r.FinishedAt, DateTime.UtcNow));
          onReachedDestinationActions.TryGetValue(tracker.Trip.Id, out var callback);
          callback?.Invoke();
        }

        await InsertMemberLocation(tracker, ping.User.Id, new(pingTime, pingNextPointIndex, ping.Delay, ping.Coordinate.Value, ping.Coordinate.Value, nextPointDistance, ping.User));
        return;
      }
      else if (currentLocation is not null && currentLocation.PointDistance <= ILianeTrackerService.NearPointDistanceInMeters)
      {
        // Getting out of a way point zone
        // TODO We can mark the current time as the effective time for the current waypoint
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
  }
  
  public async Task PushPing(Ref<Api.Trip.Trip> liane, UserPing ping)
  {
    var tracker = trackerCache.GetTracker(liane);
    if (tracker is null)
    {
      logger.LogWarning($"No tracker for liane = '{liane}'");
      return;
    }

    await PushPing(tracker, ping);
    await PublishLocation(tracker);
  }

  private async Task PublishLocation(LianeTracker tracker)
  {
    var info = tracker.GetTrackingInfo();
    foreach (var member in tracker.Trip.Members)
    {
      await lianeUpdatePushService.Push(info, member.User);
    }

    if (info.Car is not null && !tracker.Finished)
    {
      if (lastCarMove.TryGetValue(tracker.Trip.Id, out var lastMoveDate) && DateTime.UtcNow - lastMoveDate > TimeSpan.FromMinutes(StoppedDurationInMinutes))
      {
        // Notify driver
        _ = notificationService.SendInfo("Votre trajet est-il toujours en cours ?", "", tracker.Trip.Driver.User, "liane://liane/" + tracker.Trip.Id);
      }

      lastCarMove[tracker.Trip.Id] = info.Car.At;
    }
  }

  private Action GetDefaultOnReachedDestination(Ref<Api.Trip.Trip> liane)
  {
    return () =>
    {
      // Wait 5 minutes then go to "finished" state
      Task.Delay(LianeStatusUpdate.FinishedDelayInMinutes * 60 * 1000)
        .ContinueWith(async _ =>
        {
          logger.LogInformation($"Liane {liane.Id} is now Finished");
          await tripService.UpdateState(liane.Id, TripStatus.Finished);
        })
        .Start();
    };
  }

  public async Task SyncTrackers()
  {
    var started = await mongo.GetCollection<LianeDb>().Find(l => l.State == TripStatus.Started).ToListAsync();
    foreach (var lianeDb in started)
    {
      var liane = await tripService.Get(lianeDb.Id);
      await Start(liane);
    }
  }


  private async Task InsertMemberLocation(LianeTracker tracker, Ref<Api.Auth.User> user, MemberLocationSample data)
  {
    tracker.InsertMemberLocation(user, data);
    var car = tracker.GetTrackingInfo().Car;
    var update = Builders<LianeTrackReport>.Update.Push(r => r.MemberLocations, data);
    if (car is not null)
    {
      update = Builders<LianeTrackReport>.Update.Combine(update, Builders<LianeTrackReport>.Update.Push(r => r.CarLocations, car));
    }

    await mongo.GetCollection<LianeTrackReport>()
      .FindOneAndUpdateAsync(r => r.Id == tracker.Trip.Id, update);
  }


  public async Task<FeatureCollection> GetGeolocationPings(Ref<Api.Trip.Trip> liane)
  {
    var report = await mongo.GetCollection<LianeTrackReport>().Find(l => l.Id == liane.Id).FirstOrDefaultAsync();
    if (report is null) return new FeatureCollection();
    var features = report.MemberLocations
      .Where(ping => ping.Coordinate is not null)
      .Select(ping => new Feature(
        new Point(new Position(ping.Coordinate!.Value.Lat, ping.Coordinate!.Value.Lng)),
        new Dictionary<string, object> { ["user"] = ping.Member.Id, ["at"] = ping.At, ["delay"] = ping.Delay, ["next"] = ping.NextPointIndex, ["d"] = ping.PointDistance }
      ));

    var carFeatures = (report.CarLocations ?? ImmutableList.Create<Car>())
      .Select(ping => new Feature(
        new Point(new Position(ping.Position.Lat, ping.Position.Lng)),
        new Dictionary<string, object>
          { ["user"] = "car", ["at"] = ping.At, ["delay"] = ping.Delay, ["next"] = ping.NextPoint, ["isMoving"] = ping.IsMoving, ["members"] = string.Join(',', ping.Members.Select(m => m.Id)) }
      ));
    return new FeatureCollection(features.Concat(carFeatures).ToList());
  }

  public async Task<FeatureCollection> GetGeolocationPingsForCurrentUser(Ref<Api.Trip.Trip> liane)
  {
    var userId = currentContext.CurrentUser().Id;
    var features = await GetGeolocationPings(liane);
    var userFeatures = features.Features.Where(f => (string)f.Properties["user"] == userId);
    return new FeatureCollection(userFeatures.ToList());
  }

  public async Task RecreateReport(Ref<Api.Trip.Trip> lianeRef)
  {
    var liane = await tripService.Get(lianeRef);
    var previousReport = (await mongo.GetCollection<LianeTrackReport>().FindAsync(r => r.Id == liane.Id)).FirstOrDefault();
    var lianeDb = await mongo.GetCollection<LianeDb>().Find(l => l.Id == liane.Id).FirstOrDefaultAsync();
    var startDate = lianeDb.Pings.FirstOrDefault()?.At;
    if (startDate is null) return;
    try
    {
      if (previousReport is not null)
        await mongo.GetCollection<LianeTrackReport>().ReplaceOneAsync(r => r.Id == liane.Id,
          new LianeTrackReport(liane.Id, ImmutableList<MemberLocationSample>.Empty, ImmutableList<Car>.Empty, startDate.Value)
        );
      var route = await osrmService.Route(liane.WayPoints.Select(w => w.RallyingPoint.Location), overview: "full");
      var routeAsLineString = route.Routes[0].Geometry.Coordinates.ToLineString();
      var tripSession = await postgisService.CreateOfflineTrip(liane.Id, routeAsLineString);
      var tracker = new LianeTracker(tripSession, liane);
      foreach (var ping in lianeDb.Pings)
      {
        await PushPing(tracker, ping);
      }
    }
    catch (Exception)
    {
      if (previousReport is not null) await mongo.GetCollection<LianeTrackReport>().ReplaceOneAsync(r => r.Id == liane.Id, previousReport);
      throw;
    }
  }
}