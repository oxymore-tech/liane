using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
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
  private readonly IHubService hubService;
  private readonly Timer timer = new(interval: 2 * 60 * 1000);
  private readonly ConcurrentDictionary<string, Action?> onReachedDestinationActions = new();
  private readonly ITripService tripService;
  private readonly ICurrentContext currentContext;

  public LianeTrackerServiceImpl(LianeTrackerCache trackerCache, ILogger<LianeTrackerServiceImpl> logger, IPostgisService postgisService, IOsrmService osrmService, IMongoDatabase mongo,
    IHubService hubService, ITripService tripService, ICurrentContext currentContext)
  {
    this.trackerCache = trackerCache;
    this.logger = logger;
    this.postgisService = postgisService;
    this.osrmService = osrmService;
    this.mongo = mongo;
    this.hubService = hubService;
    this.tripService = tripService;
    this.currentContext = currentContext;
    timer.Elapsed += (_, _) =>
    {
      foreach (var tracker in trackerCache.Trackers)
      {
        PublishLocation(tracker).ConfigureAwait(false).GetAwaiter().GetResult();
      }
    };
  }

  public async Task<TripTracker> Start(Api.Trip.Trip trip, Action? onReachedDestination = null)
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

      return new TripTracker(tripSession, trip);
    });
  }

  private async Task PushPing(TripTracker tracker, UserPing ping)
  {
    var pingTime = ping.At;

    var currentLocation = tracker.GetCurrentLocation(ping.User.Id);
    var nextPointIndex = currentLocation?.NextPointIndex ?? tracker.GetFirstWayPoint(ping.User.Id);

    if (ping.Coordinate is null)
    {
      var memberLocationSample = new MemberLocationSample(pingTime, nextPointIndex, TimeSpan.Zero, null, null, double.PositiveInfinity, ping.User);
      await InsertMemberLocation(tracker, ping.User.Id, memberLocationSample);
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
      var delay = TimeSpan.FromSeconds(table.Durations[0][1]!.Value);

      var memberLocationSample = new MemberLocationSample(pingTime, nextPointIndex, delay, computedLocation, ping.Coordinate.Value, nextPointDistance, ping.User);
      await InsertMemberLocation(tracker, ping.User.Id, memberLocationSample);
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
        if (nextPointIndex == tracker.Trip.WayPoints.Count - 1)
        {
          // Driver arrived near destination point
          await mongo.GetCollection<LianeTrackReport>()
            .FindOneAndUpdateAsync(r => r.Id == tracker.Trip.Id, Builders<LianeTrackReport>.Update.Set(r => r.FinishedAt, DateTime.UtcNow));
          onReachedDestinationActions.TryGetValue(tracker.Trip.Id, out var callback);
          callback?.Invoke();
        }

        var locationSample = new MemberLocationSample(pingTime, pingNextPointIndex, TimeSpan.Zero, ping.Coordinate.Value, ping.Coordinate.Value, nextPointDistance, ping.User);
        await InsertMemberLocation(tracker, ping.User.Id, locationSample);
        return;
      }

      if (currentLocation is not null && currentLocation.PointDistance <= ILianeTrackerService.NearPointDistanceInMeters)
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
      var delay = estimatedDuration;

      var memberLocationSample = new MemberLocationSample(pingTime, pingNextPointIndex, delay, computedLocation, ping.Coordinate.Value, nextPointDistance, ping.User);
      await InsertMemberLocation(tracker, ping.User.Id, memberLocationSample);
    }
  }

  public async Task SendPing(MemberPing e)
  {
    var at = DateTimeOffset.FromUnixTimeMilliseconds(e.Timestamp).UtcDateTime;
    var memberId = currentContext.CurrentUser().Id;
    var ping = new UserPing(memberId, at, e.Coordinate);
    await PushPing(e.Trip, ping);
  }

  public async Task PushPing(Ref<Api.Trip.Trip> trip, UserPing ping)
  {
    var (resolved, tripMember) = await tripService.StartTrip(trip, ping.User);

    var tracker = trackerCache.GetTracker(trip);
    if (tracker is null)
    {
      logger.LogWarning("No tracker for trip = '{trip}'", trip);
      throw new ResourceNotFoundException("No tracker");
    }

    await PushPing(tracker, ping);
    await PublishLocation(tracker);

    if (resolved.State != TripStatus.Started)
    {
      throw new ResourceNotFoundException("Not started");
    }

    if (tracker.MemberHasArrived(tripMember))
    {
      var updated = await tripService.UpdateFeedback(tracker.Trip, ping.User, new Feedback(false, "Automatic via ping"));
      await hubService.PushTripUpdate(updated);
      throw new ResourceNotFoundException("Arrived");
    }
  }

  private async Task PublishLocation(TripTracker tracker)
  {
    var info = tracker.GetTrackingInfo();
    foreach (var member in tracker.Trip.Members)
    {
      await hubService.PushTrackingInfo(info, member.User);
    }
  }

  private Action GetDefaultOnReachedDestination(Ref<Api.Trip.Trip> liane)
  {
    return () =>
    {
      // Wait 5 minutes then go to "finished" state
      Task.Run(async () =>
      {
        await Task.Delay(LianeStatusUpdate.FinishedDelayInMinutes * 60 * 1000);
        logger.LogInformation($"Liane {liane.Id} is now Finished");
        await tripService.UpdateState(liane.Id, TripStatus.Finished);
      });
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

  private async Task InsertMemberLocation(TripTracker tracker, Ref<Api.Auth.User> user, MemberLocationSample data)
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
    if (startDate is null)
    {
      return;
    }

    try
    {
      if (previousReport is not null)
      {
        await mongo.GetCollection<LianeTrackReport>().ReplaceOneAsync(r => r.Id == liane.Id,
          new LianeTrackReport(liane.Id, ImmutableList<MemberLocationSample>.Empty, ImmutableList<Car>.Empty, startDate.Value)
        );
      }

      var route = await osrmService.Route(liane.WayPoints.Select(w => w.RallyingPoint.Location), overview: "full");
      var routeAsLineString = route.Routes[0].Geometry.Coordinates.ToLineString();
      await using var tripSession = await postgisService.CreateOfflineTrip(liane.Id, routeAsLineString);
      var tracker = new TripTracker(tripSession, liane);
      foreach (var ping in lianeDb.Pings)
      {
        await PushPing(tracker, ping);
      }
    }
    catch (Exception)
    {
      if (previousReport is not null)
      {
        await mongo.GetCollection<LianeTrackReport>().ReplaceOneAsync(r => r.Id == liane.Id, previousReport);
      }

      throw;
    }
  }
}