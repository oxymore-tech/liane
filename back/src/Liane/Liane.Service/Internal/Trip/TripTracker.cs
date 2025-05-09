using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Trip.Geolocation;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip;

public sealed class TripTracker
{
  private readonly ConcurrentDictionary<string, BufferedList<MemberLocationSample>> currentLocationMap = new();
  private readonly double[] wayPointFractions;
  private TrackingInfo? lastTrackingInfo;

  public TripTracker(ITripSession tripSession, Api.Trip.Trip trip)
  {
    Trip = trip;
    TripSession = tripSession;
    wayPointFractions = new double[trip.WayPoints.Count];
    Array.Fill(wayPointFractions, -1);
    wayPointFractions[0] = 0.0;
  }

  public Api.Trip.Trip Trip { get; }

  public ITripSession TripSession { get; }

  public async Task<double> GetWayPointFraction(int index)
  {
    var nextPointFraction = wayPointFractions[index];
    if (!(nextPointFraction < 0))
    {
      return nextPointFraction;
    }

    var locationOnRoute = await TripSession.LocateOnRoute(Trip.WayPoints[index].RallyingPoint.Location);
    if (!(locationOnRoute.distance < ILianeTrackerService.NearPointDistanceInMeters))
    {
      return nextPointFraction;
    }

    nextPointFraction = locationOnRoute.fraction;
    wayPointFractions[index] = nextPointFraction;

    return nextPointFraction;
  }

  public async Task<int> FindNextWayPointIndex(int startIndex, double routeFraction)
  {
    while (startIndex < Trip.WayPoints.Count)
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

  public void InsertMemberLocation(Ref<Api.Auth.User> user, MemberLocationSample data)
  {
    currentLocationMap.TryGetValue(user.Id, out var bufferedLocations);
    if (bufferedLocations is null)
    {
      currentLocationMap[user.Id] = new BufferedList<MemberLocationSample>(3) { data };
    }
    else
    {
      bufferedLocations.Add(data);
    }

    // Invalidate tracking info
    lastTrackingInfo = null;
  }


  public MemberLocationSample? GetCurrentLocation(string userId)
  {
    currentLocationMap.TryGetValue(userId, out var currentLocation);
    return currentLocation is not null && currentLocation.Count > 0 ? currentLocation.Peek() : null;
  }

  public TrackedMemberLocation? GetCurrentMemberLocation(Ref<Api.Auth.User> member)
  {
    var lastLocations = currentLocationMap.GetValueOrDefault(member.Id);

    var currentLocation = lastLocations?.Peek();
    if (currentLocation is null)
    {
      return null;
    }

    var isMoving = IsMoving(currentLocation, lastLocations);

    var nextWayPoint = Trip.GetWayPoint(currentLocation.NextPointIndex);

    var delay = nextWayPoint.Eta - currentLocation.At.AddMilliseconds(currentLocation.Delay.TotalMilliseconds);

    return new TrackedMemberLocation(member, Trip, currentLocation.At, nextWayPoint.RallyingPoint, (long)delay.TotalMilliseconds,
      currentLocation.RawCoordinate, isMoving);
  }

  private static bool IsMoving(MemberLocationSample currentLocation, IReadOnlyCollection<MemberLocationSample>? lastLocations)
  {
    return !currentLocation.Coordinate.HasValue || lastLocations!.Count == 1 ||
           lastLocations.Any(l => l.Coordinate.HasValue && l.Coordinate.Value.Distance(currentLocation.Coordinate.Value) > 1);
  }

  public bool MemberHasArrived(TripMember tripMember)
  {
    var member = tripMember.User;
    var currentLocation = GetCurrentLocation(member.Id);
    var memberArrivalIndex = Trip.WayPoints.FindIndex(w => w.RallyingPoint.Id == tripMember.To.Id);

    if (currentLocation?.NextPointIndex == memberArrivalIndex && currentLocation.PointDistance < ILianeTrackerService.NearPointDistanceInMeters)
    {
      return true;
    }
    
    if (lastTrackingInfo?.Car is null)
    {
      return false;
    }

    var carNextPointIndex = Trip.WayPoints.FindIndex(w => w.RallyingPoint.Id == lastTrackingInfo.Car.NextPoint.Id);
    return memberArrivalIndex < carNextPointIndex || 
           (memberArrivalIndex == carNextPointIndex && lastTrackingInfo.Car.PointDistance < ILianeTrackerService.NearPointDistanceInMeters);
  }

  public bool MemberHasArrived(Ref<Api.Auth.User> member)
  {
    var tripMember = Trip.Members.Find(m => m.User.Id == member.Id);
    return tripMember is not null && MemberHasArrived(tripMember);
  }

  public int GetFirstWayPoint(string userId)
  {
    int foundIndex;
    if (Trip.Driver.User.Id == userId)
    {
      var waypointsWithPassengers = Trip.Members
        .Where(m => m.User.Id != Trip.Driver.User)
        .GroupBy(m => m.From)
        .Select(g => g.Key.Id)
        .ToImmutableHashSet();
      foundIndex = Trip.WayPoints.FindIndex(w => waypointsWithPassengers.Contains(w.RallyingPoint.Id!));
    }
    else
    {
      var lianeMember = Trip.Members.Find(m => m.User.Id == userId);
      if (lianeMember is null) return 0;
      foundIndex = Trip.WayPoints.FindIndex(w => w.RallyingPoint.Id! == lianeMember.From.Id);
    }

    return foundIndex < 0 ? 0 : foundIndex;
  }

  public TrackingInfo GetTrackingInfo()
  {
    if (lastTrackingInfo is not null)
    {
      return lastTrackingInfo;
    }

    var carPassengers = currentLocationMap.Where(entry =>
      {
        var userId = entry.Key;
        var lastLocation = entry.Value.Peek()!;
        var lianeMember = Trip.Members.Find(m => m.User.Id == userId)!;
        return userId == Trip.Driver.User.Id || lianeMember.From.Id != Trip.GetWayPoint(lastLocation.NextPointIndex).RallyingPoint.Id;
      })
      .Select(entry => (Ref<Api.Auth.User>)entry.Key).ToImmutableHashSet();

    var lastCarPings = currentLocationMap
      .Where(entry => carPassengers.Contains(entry.Key))
      .SelectMany(entry => entry.Value)
      .OrderByDescending(ping => ping.At)
      .Take(3)
      .ToImmutableList();

    var carPosition = lastCarPings.FirstOrDefault();

    var car = carPosition?.Coordinate is not null
      ? new Car(
        carPosition.At,
        Trip.GetWayPoint(carPosition.NextPointIndex).RallyingPoint,
        (long)carPosition.Delay.TotalMilliseconds,
        carPosition.Coordinate.Value,
        carPassengers,
        IsMoving(lastCarPings.First(), lastCarPings),
        carPosition.PointDistance
      )
      : null;

    var otherMembers = currentLocationMap
      .Where(entry => !carPassengers.Contains(entry.Key))
      .ToImmutableDictionary(
        entry => entry.Key,
        entry => GetCurrentMemberLocation(entry.Key)!
      );
    lastTrackingInfo = new TrackingInfo(Trip.Id, car, otherMembers);
    return lastTrackingInfo;
  }

  public async Task Dispose()
  {
    await TripSession.DisposeAsync();
  }
}