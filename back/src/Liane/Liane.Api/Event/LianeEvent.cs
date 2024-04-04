using System;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

[Union]
public abstract record LianeEvent
{
  private LianeEvent()
  {
  }

  public abstract Ref<Trip.Trip> Liane { get; init; }

  public sealed record JoinRequest(
    Ref<Trip.Trip> Liane,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip,
    string Message,
    GeolocationLevel GeolocationLevel = GeolocationLevel.None
  ) : LianeEvent;
  
  public sealed record ChangeDepartureTimeRequest(
    Ref<Trip.Trip> Liane,
    Ref<RallyingPoint> From,
    DateTime At
  ) : LianeEvent;
  public sealed record MemberAccepted(
    Ref<Trip.Trip> Liane,
    Ref<Auth.User> Member,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip
  ) : LianeEvent;

  public sealed record MemberRejected(
    Ref<Trip.Trip> Liane,
    Ref<Auth.User> Member,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip,
    string? Reason = null
  ) : LianeEvent;

  public sealed record MemberHasLeft(
    Ref<Trip.Trip> Liane,
    Ref<Auth.User> Member
  ) : LianeEvent;

  public sealed record MemberPing(
    Ref<Trip.Trip> Liane,
    long Timestamp,
    TimeSpan? Delay,
    LatLng? Coordinate = null
  ) : LianeEvent;
  
  public sealed record MemberHasCanceled(
    Ref<Trip.Trip> Liane,
    Ref<Auth.User> Member
  ) : LianeEvent;
  
  public sealed record MemberHasStarted(
    Ref<Trip.Trip> Liane,
    Ref<Auth.User> Member
  ) : LianeEvent;
}