using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;


public sealed class LianeTracker
{
  private const double NearPointDistanceInMeters = 100;
  private readonly Api.Trip.Liane liane;
  private readonly ConcurrentDictionary<string, MemberLocationSample?> currentLocationMap = new();
  private readonly Action onTripArrivedDestination;
  private readonly IOsrmService osrmService;
  private readonly IMongoDatabase mongo;
  private readonly IOngoingTripSession ongoingTripSession;
  private readonly double[] wayPointFractions;
  private bool finished = false;
  private LianeTracker(IOsrmService osrmService, IMongoDatabase mongo, Api.Trip.Liane liane, Action onTripArrivedDestination, IOngoingTripSession ongoingTripSession)
  {
    this.liane = liane;
    this.onTripArrivedDestination = onTripArrivedDestination;
    this.ongoingTripSession = ongoingTripSession;
    this.mongo = mongo;
    this.osrmService = osrmService;
    wayPointFractions = new double[liane.WayPoints.Count];
    Array.Fill(wayPointFractions, -1);
    wayPointFractions[0] = 0.0;
  }
  
  public sealed class Builder
  {
    private readonly Api.Trip.Liane liane;
    private Action? onTripArrivedDestination;
    private IOngoingTripSession tripSession = null!;

    public Builder(Api.Trip.Liane liane)
    {
      this.liane = liane;
    }

    public Builder SetTripArrivedDestinationCallback(Action onArrivedDestination)
    {
      onTripArrivedDestination = onArrivedDestination;
      return this;
    }

    public async Task<LianeTracker> Build(IOsrmService osrmService, IPostgisService postgisService, IMongoDatabase mongo, ILogger<LianeTracker> logger)
    {
      var route = await osrmService.Route(liane.WayPoints.Select(w => w.RallyingPoint.Location));
      var routeAsLineString = route.Routes[0].Geometry.Coordinates.ToLineString();
      tripSession  = await postgisService.CreateOngoingTrip(liane.Id, routeAsLineString);

      var previousReport = (await mongo.GetCollection<LianeTrackReport>().FindAsync(r => r.Id == liane.Id)).FirstOrDefault();
      if (previousReport is not null)
      {
        logger.LogInformation($"Using previously created report : {liane.Id}");
      }
      else
      {
        await mongo.GetCollection<LianeTrackReport>().InsertOneAsync(new LianeTrackReport(liane, ImmutableList<MemberLocationSample>.Empty, DateTime.UtcNow));
      }
      return new LianeTracker(osrmService, mongo, liane, onTripArrivedDestination ?? delegate {  }, tripSession);
    }
  }
  private int GetFirstPoint(Ref<Api.User.User> user)
  {
    var member = liane.Members.First(m => m.User.Id == user.Id);
    return liane.WayPoints.FindIndex(w => w.RallyingPoint.Id == member.From.Id);
  }

  private async Task InsertMemberLocation(Ref<Api.User.User> user, MemberLocationSample data)
  {
    currentLocationMap[user.Id] = data;
    await mongo.GetCollection<LianeTrackReport>()
      .FindOneAndUpdateAsync(r => r.Id == liane.Id, Builders<LianeTrackReport>.Update.Push(r => r.MemberLocations,data ));
  }
  
  public async Task Push(UserPing ping)
  {
    var pingTime = ping.At;

    currentLocationMap.TryGetValue(ping.User.Id, out var currentLocation);
    var nextPointIndex = currentLocation?.NextPointIndex ?? GetFirstPoint(ping.User.Id);

    if (ping.Coordinate is null)
    {
      await InsertMemberLocation(ping.User.Id, new (pingTime, nextPointIndex, ping.Delay, null, null, double.PositiveInfinity, ping.User));
      return;
    }
 
    // Snap coordinate to nearest road segment
    var locationOnRoute = await ongoingTripSession.LocateOnRoute(ping.Coordinate.Value);
    // If too far away from route, skip
    if (locationOnRoute.distance > NearPointDistanceInMeters)
    {
      var nextPoint = liane.WayPoints[nextPointIndex].RallyingPoint;
      var nextPointDistance = ping.Coordinate.Value.Distance(nextPoint.Location);
      var computedLocation =  await osrmService.Nearest(ping.Coordinate.Value) ?? ping.Coordinate.Value;
      var table = await osrmService.Table(new List<LatLng> { computedLocation, nextPoint.Location });
      var estimatedDuration = TimeSpan.FromSeconds(table.Durations[0][1]!.Value);
      var delay = estimatedDuration + ping.Delay;
      await InsertMemberLocation(ping.User.Id,  new (pingTime,  nextPointIndex, delay, computedLocation, ping.Coordinate.Value, nextPointDistance, ping.User));
      
    }
    else
    {
      var nextPoint = liane.WayPoints[nextPointIndex].RallyingPoint;
      var nextPointDistance = ping.Coordinate.Value.Distance(nextPoint.Location);
      var wayPointInRange = nextPointDistance <= NearPointDistanceInMeters;
      var pingNextPointIndex = nextPointIndex;
      if (wayPointInRange)
      {
        // Send raw coordinate
        if (nextPointIndex == liane.WayPoints.Count - 1 && ping.User == liane.Driver.User)
        {
          // Driver arrived near destination point
          await mongo.GetCollection<LianeTrackReport>()
            .FindOneAndUpdateAsync(r => r.Id == liane.Id, Builders<LianeTrackReport>.Update.Set(r => r.FinishedAt, DateTime.UtcNow));
          finished = true;
          onTripArrivedDestination();
        }

        await InsertMemberLocation(ping.User.Id, new(pingTime, pingNextPointIndex, ping.Delay, ping.Coordinate.Value, ping.Coordinate.Value, nextPointDistance, ping.User));
        return;
      }
      else if (currentLocation is not null && currentLocation.PointDistance <= NearPointDistanceInMeters)
      {
        // Getting out of a way point zone
        pingNextPointIndex++;
      }
      else
      {
        // check point fraction 
        var nextPointFraction = await GetWayPointFraction(nextPointIndex);

        if (nextPointFraction < locationOnRoute.fraction)
        {
          // One or more waypoints were missed 
          pingNextPointIndex = await FindNextWayPointIndex(nextPointIndex + 1, locationOnRoute.fraction);

        }
      }

      var computedLocation = locationOnRoute.nearestPoint;
      var table = await osrmService.Table(new List<LatLng> { computedLocation, nextPoint.Location });
      var estimatedDuration = TimeSpan.FromSeconds(table.Durations[0][1]!.Value);
      var delay = estimatedDuration + ping.Delay;

      await InsertMemberLocation(ping.User.Id, new(pingTime, pingNextPointIndex, delay, computedLocation, ping.Coordinate.Value, nextPointDistance, ping.User));
    }
  }

  private async Task<double> GetWayPointFraction(int index)
  {
    var nextPointFraction = wayPointFractions[index];
    if (nextPointFraction < 0)
    {
      var locationOnRoute = await ongoingTripSession.LocateOnRoute(liane.WayPoints[index].RallyingPoint.Location);
      if (locationOnRoute.distance < NearPointDistanceInMeters)
      {
        nextPointFraction = locationOnRoute.fraction;
        wayPointFractions[index] = nextPointFraction;
      }
    }

    return nextPointFraction;
  }

  private async Task<int> FindNextWayPointIndex(int startIndex, double routeFraction)
  {
    while (startIndex < liane.WayPoints.Count)
    {
      var nextPointFraction = await GetWayPointFraction(startIndex);
      if (nextPointFraction >= routeFraction)
      {
        return startIndex;
      }

      startIndex++;
    }

    return -1;
  }

  public async Task Dispose()
  {
    await ongoingTripSession.Dispose();
  }
  public TrackedMemberLocation? GetCurrentMemberLocation(Ref<Api.User.User> member)
  {
    currentLocationMap.TryGetValue(member.Id, out var currentLocation);
    if (currentLocation is null) return null;
    return new TrackedMemberLocation(member, liane, currentLocation.At, liane.WayPoints[currentLocation.NextPointIndex].RallyingPoint, (long)currentLocation.Delay.TotalSeconds, currentLocation.RawCoordinate);
  }

  private int? GetDriverNextIndex()
  {
    currentLocationMap.TryGetValue(liane.Driver.User.Id, out var driverCurrentLocation);
    if (driverCurrentLocation is not null)
    {
      return driverCurrentLocation.NextPointIndex;
    }

    return null;
  }
  /// <summary>
  /// Check if given member, or else the driver has arrived
  /// </summary>
  /// <param name="member"></param>
  /// <returns>null if current member does not share its position, a boolean otherwise</returns>
  public bool? MemberHasArrived(Ref<Api.User.User> member)
  {
    currentLocationMap.TryGetValue(member.Id, out var currentLocation);
    var memberArrivalIndex = liane.WayPoints.FindIndex(w => w.RallyingPoint.Id == liane.Members.Find(m => m.User.Id == member.Id)!.To.Id);
    if (currentLocation is null)
    {
      if (liane.Driver.User.Id != member.Id)
      {
        var driverNextIndex = GetDriverNextIndex();
        return driverNextIndex is null ? null : memberArrivalIndex < driverNextIndex || finished;
      }

      return null;
    }

    var arrived = memberArrivalIndex < currentLocation.NextPointIndex || finished;
    if (arrived) return true;
    if (liane.Driver.User.Id != member.Id)
    {
      var driverNextIndex = GetDriverNextIndex();
      return driverNextIndex is null ? null : memberArrivalIndex < driverNextIndex || finished;
    }

    return false;
  }
}