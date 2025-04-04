using System;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Auth;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public enum TripStatus
{
  NotStarted,
  Started,
  Finished, // en theorie tout le monde est arrivée
  Archived, // on a eu une confirmation que le trajet ce soit bien passé
  Canceled
}

public enum GeolocationLevel
{
  None,
  Hidden,
  Shared
}

public sealed record Feedback(
  bool Canceled = false,
  string? Comment = null
);

public sealed record TripMember(
  [property: SerializeAsResolvedRef] Ref<User> User,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  int SeatCount = -1, // Defaults to a passenger seat
  Feedback? Feedback = null,
  GeolocationLevel GeolocationLevel = GeolocationLevel.None,
  DateTime? Departure = null,
  DateTime? Cancellation = null,
  DateTime? Arrival = null,
  bool TakeReturnTrip = false
) : IResourceMember;

public sealed record Driver(
  Ref<User> User,
  bool CanDrive = true
);

public sealed record Trip(
  string Id,
  Ref<Community.Liane> Liane,
  Ref<User> CreatedBy,
  DateTime? CreatedAt,
  DateTime DepartureTime,
  Ref<Trip>? Return,
  ImmutableList<WayPoint> WayPoints,
  ImmutableList<TripMember> Members,
  Driver Driver,
  TripStatus State
) : IEntity<string>, ISharedResource<TripMember>
{
  public WayPoint GetWayPoint(int nextPointIndex)
  {
    if (nextPointIndex < 0 || nextPointIndex > WayPoints.Count - 1)
    {
      return WayPoints.Last();
    }

    return WayPoints[nextPointIndex];
  }
}