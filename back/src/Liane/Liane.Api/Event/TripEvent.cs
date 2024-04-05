using System;
using Liane.Api.Auth;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

[Union]
public abstract record TripEvent
{
  private TripEvent()
  {
  }

  public abstract Ref<Trip.Trip> Trip { get; init; }

  public sealed record JoinRequest(
    Ref<Trip.Trip> Trip,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip,
    string Message,
    GeolocationLevel GeolocationLevel = GeolocationLevel.None
  ) : TripEvent;

  public sealed record ChangeDepartureTimeRequest(
    Ref<Trip.Trip> Trip,
    Ref<RallyingPoint> From,
    DateTime At
  ) : TripEvent;

  public sealed record MemberAccepted(
    Ref<Trip.Trip> Trip,
    Ref<User> Member,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip
  ) : TripEvent;

  public sealed record MemberRejected(
    Ref<Trip.Trip> Trip,
    Ref<User> Member,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip,
    string? Reason = null
  ) : TripEvent;

  public sealed record MemberHasLeft(
    Ref<Trip.Trip> Trip,
    Ref<User> Member
  ) : TripEvent;

  public sealed record MemberPing(
    Ref<Trip.Trip> Trip,
    long Timestamp,
    TimeSpan? Delay,
    LatLng? Coordinate = null
  ) : TripEvent;

  public sealed record MemberHasCanceled(
    Ref<Trip.Trip> Trip,
    Ref<User> Member
  ) : TripEvent;

  public sealed record MemberHasStarted(
    Ref<Trip.Trip> Trip,
    Ref<User> Member
  ) : TripEvent;
}