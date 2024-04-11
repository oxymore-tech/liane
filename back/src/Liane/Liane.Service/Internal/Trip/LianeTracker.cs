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

public sealed class LianeTracker
{
  private readonly ConcurrentDictionary<string, BufferedList<MemberLocationSample>> currentLocationMap = new();
  private readonly double[] wayPointFractions;
  private TrackingInfo? lastTrackingInfo;

  public LianeTracker(ITripSession tripSession, Api.Trip.Liane liane)
  {
    Liane = liane;
    TripSession = tripSession;
    wayPointFractions = new double[liane.WayPoints.Count];
    Array.Fill(wayPointFractions, -1);
    wayPointFractions[0] = 0.0;
  }

  public Api.Trip.Liane Liane { get; }

  public ITripSession TripSession { get; }

  public bool Finished { get; private set; }

  public void Finish()
  {
    Finished = true;
  }

  public async Task<double> GetWayPointFraction(int index)
  {
    var nextPointFraction = wayPointFractions[index];
    if (!(nextPointFraction < 0))
    {
      return nextPointFraction;
    }

    var locationOnRoute = await TripSession.LocateOnRoute(Liane.WayPoints[index].RallyingPoint.Location);
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
    while (startIndex < Liane.WayPoints.Count)
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

  public void InsertMemberLocation(Ref<Api.User.User> user, MemberLocationSample data)
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

  public TrackedMemberLocation? GetCurrentMemberLocation(Ref<Api.User.User> member)
  {
    currentLocationMap.TryGetValue(member.Id, out var lastLocations);

    var currentLocation = lastLocations?.Peek();
    if (currentLocation is null) return null;
    var isMoving = IsMoving(currentLocation, lastLocations);
    return new TrackedMemberLocation(member, Liane, currentLocation.At, Liane.GetWayPoint(currentLocation.NextPointIndex).RallyingPoint, (long)currentLocation.Delay.TotalSeconds,
      currentLocation.RawCoordinate, isMoving);
  }

  private static bool IsMoving(MemberLocationSample currentLocation, IReadOnlyCollection<MemberLocationSample>? lastLocations)
  {
    return !currentLocation.Coordinate.HasValue || lastLocations!.Count == 1 ||
           lastLocations.Any(l => l.Coordinate.HasValue && l.Coordinate.Value.Distance(currentLocation.Coordinate.Value) > 1);
  }

  /// <summary>
  /// Check if given member, or else the driver has arrived
  /// </summary>
  /// <param name="member"></param>
  /// <returns>null if current member does not share its position, a boolean otherwise</returns>
  public bool? MemberHasArrived(Ref<Api.User.User> member)
  {
    var currentLocation = GetCurrentLocation(member.Id);

    var memberArrivalIndex = Liane.WayPoints.FindIndex(w => w.RallyingPoint.Id == Liane.Members.Find(m => m.User.Id == member.Id)!.To.Id);
    if (currentLocation is null)
    {
      if (Liane.Driver.User.Id != member.Id)
      {
        var driverNextIndex = GetDriverNextIndex();
        return driverNextIndex is null ? null : memberArrivalIndex < driverNextIndex || Finished;
      }

      return null;
    }

    var arrived = memberArrivalIndex < currentLocation.NextPointIndex || Finished;
    if (arrived) return true;
    if (Liane.Driver.User.Id != member.Id)
    {
      var driverNextIndex = GetDriverNextIndex();
      return driverNextIndex is null ? null : memberArrivalIndex < driverNextIndex || Finished;
    }

    return false;
  }

  public int GetFirstWayPoint(string userId)
  {
    int foundIndex;
    if (Liane.Driver.User.Id == userId)
    {
      var waypointsWithPassengers = Liane.Members
        .Where(m => m.User.Id != Liane.Driver.User)
        .GroupBy(m => m.From)
        .Select(g => g.Key.Id)
        .ToImmutableHashSet();
      foundIndex = Liane.WayPoints.FindIndex(w => waypointsWithPassengers.Contains(w.RallyingPoint.Id!));
    }
    else
    {
      var lianeMember = Liane.Members.Find(m => m.User.Id == userId);
      if (lianeMember is null) return 0;
      foundIndex = Liane.WayPoints.FindIndex(w => w.RallyingPoint.Id! == lianeMember.From.Id);
    }

    return foundIndex < 0 ? 0 : foundIndex;
  }

  public TrackingInfo GetTrackingInfo()
  {
    if (lastTrackingInfo is not null) return lastTrackingInfo;
    var carPassengers = currentLocationMap.Where(entry =>
      {
        var userId = entry.Key;
        var lastLocation = entry.Value.Peek()!;
        var lianeMember = Liane.Members.Find(m => m.User.Id == userId)!;
        return userId == Liane.Driver.User.Id || lianeMember.From.Id != Liane.GetWayPoint(lastLocation.NextPointIndex).RallyingPoint.Id;
      })
      .Select(entry => (Ref<Api.User.User>)entry.Key).ToImmutableHashSet();

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
        Liane.GetWayPoint(carPosition.NextPointIndex).RallyingPoint,
        (long)carPosition.Delay.TotalSeconds,
        carPosition.Coordinate.Value,
        carPassengers,
        IsMoving(lastCarPings.First(), lastCarPings)
      )
      : null;

    var otherMembers = currentLocationMap
      .Where(entry => !carPassengers.Contains(entry.Key))
      .ToImmutableDictionary(
        entry => entry.Key,
        entry => GetCurrentMemberLocation(entry.Key)!
      );
    lastTrackingInfo = new TrackingInfo(Liane, car, otherMembers);
    return lastTrackingInfo;
  }

  public async Task Dispose()
  {
    await TripSession.DisposeAsync();
  }

  private int? GetDriverNextIndex()
  {
    var driverCurrentLocation = GetCurrentLocation(Liane.Driver.User.Id);

    return driverCurrentLocation?.NextPointIndex;
  }
}