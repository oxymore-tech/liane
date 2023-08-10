using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.DependencyInjection;

namespace Liane.Service.Internal.Trip;


public sealed class LianeTracker
{
  private const double NearPointDistanceInMeters = 500;
  private const double NearPointTimeSpanInMinutes = 5 ;
  private readonly Api.Trip.Liane liane;
  private readonly ConcurrentDictionary<string, (DateTime At, int NextPointIndex, TimeSpan Delay, LatLng? Coordinate,  LatLng? RawCoordinate,  double PointDistance)?> currentLocationMap = new();
  private readonly Action onTripArrivedDestination;
  private readonly IOsrmService osrmService;
  private readonly IOngoingTripSession ongoingTripSession;
  private readonly double[] wayPointFractions;
  private LianeTracker(IOsrmService osrmService, Api.Trip.Liane liane, Action onTripArrivedDestination, IOngoingTripSession ongoingTripSession)
  {
    this.liane = liane;
    this.onTripArrivedDestination = onTripArrivedDestination;
    this.ongoingTripSession = ongoingTripSession;
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
    private int autoDisposeTimeout = 0;

    public Builder(Api.Trip.Liane liane)
    {
      this.liane = liane;
    }

    public Builder SetTripArrivedDestinationCallback(Action onArrivedDestination)
    {
      onTripArrivedDestination = onArrivedDestination;
      return this;
    }
    public Builder SetAutoDisposeTimeout(Func<Task> onTimeout, int delayMillis)
    {
      Task.Delay(delayMillis).ContinueWith(async _ =>
      {
        await tripSession.Dispose();
        await onTimeout();
      });
      autoDisposeTimeout = delayMillis;
      return this;
    }

    public async Task<LianeTracker> Build(ServiceProvider serviceProvider)
    {
      var osrmService = serviceProvider.GetService<IOsrmService>()!;
      var postgisService = serviceProvider.GetService<IPostgisService>()!;
      var route = await osrmService.Route(liane.WayPoints.Select(w => w.RallyingPoint.Location));
      var routeAsLineString = route.Routes[0].Geometry.Coordinates.ToLineString();
      tripSession  = await postgisService.CreateOngoingTrip(liane.Id, routeAsLineString);
      if (autoDisposeTimeout == 0)
      {
        SetAutoDisposeTimeout(() => Task.CompletedTask, 3600 * 1000);
      }
      return new LianeTracker(osrmService, liane, onTripArrivedDestination ?? delegate {  }, tripSession);
    }
  }
  private int GetFirstPoint(Ref<Api.User.User> user)
  {
    var member = liane.Members.First(m => m.User.Id == user.Id);
    return liane.WayPoints.FindIndex(w => w.RallyingPoint.Id == member.From.Id);
  }
  
  public async Task Push(UserPing ping)
  {
    var now = DateTime.UtcNow;

    currentLocationMap.TryGetValue(ping.User.Id, out var currentLocation);
    var nextPointIndex = currentLocation?.NextPointIndex ?? GetFirstPoint(ping.User.Id);

    if (ping.Coordinate is null)
    {
      currentLocationMap[ping.User.Id] = (ping.At, nextPointIndex, ping.Delay, null, null, double.PositiveInfinity);
      return;
    }
 
    // Snap coordinate to nearest road segment
    var locationOnRoute = await ongoingTripSession.LocateOnRoute(ping.Coordinate.Value);
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
        onTripArrivedDestination();
      }
      currentLocationMap[ping.User.Id] = (ping.At, pingNextPointIndex, ping.Delay, ping.Coordinate.Value, ping.Coordinate.Value,nextPointDistance);
      return;
    }
    else if (currentLocation is not null && currentLocation.Value.PointDistance <= NearPointDistanceInMeters)
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

    var table = await osrmService.Table(new List<LatLng> { locationOnRoute.nearestPoint, nextPoint.Location });
    var estimatedDuration = TimeSpan.FromSeconds(table.Durations[0][1]!.Value);
    var delay = now + estimatedDuration - liane.WayPoints.First(w => w.RallyingPoint.Id == nextPoint.Id).Eta + ping.Delay;
   
    currentLocationMap[ping.User.Id] = (ping.At, pingNextPointIndex, delay, locationOnRoute.nearestPoint, ping.Coordinate.Value, nextPointDistance);
    
  }

  private async Task<double> GetWayPointFraction(int index)
  {
    var nextPointFraction = wayPointFractions[index];
    if (nextPointFraction < 0)
    {
      nextPointFraction = (await ongoingTripSession.LocateOnRoute(liane.WayPoints[index].RallyingPoint.Location)).fraction;
      wayPointFractions[index] = nextPointFraction;
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