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

  public abstract Ref<Trip.Liane> Liane { get; init; }

  public sealed record JoinRequest(
    Ref<Trip.Liane> Liane,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip,
    string Message
  ) : LianeEvent;
  
  public sealed record ChangeDepartureTimeRequest(
    Ref<Trip.Liane> Liane,
    Ref<RallyingPoint> From,
    DateTime At
  ) : LianeEvent;
  public sealed record MemberAccepted(
    Ref<Trip.Liane> Liane,
    Ref<User.User> Member,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip
  ) : LianeEvent;

  public sealed record MemberRejected(
    Ref<Trip.Liane> Liane,
    Ref<User.User> Member,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip,
    string? Reason = null
  ) : LianeEvent;

  public sealed record MemberHasLeft(
    Ref<Trip.Liane> Liane,
    Ref<User.User> Member
  ) : LianeEvent;

  public sealed record MemberPing(
    Ref<Trip.Liane> Liane,
    long Timestamp,
    TimeSpan? Delay,
    LatLng? Coordinate = null
  ) : LianeEvent;
  
  public sealed record MemberHasCanceled(
    Ref<Trip.Liane> Liane,
    Ref<User.User> Member
  ) : LianeEvent;
  
  public sealed record MemberHasStarted(
    Ref<Trip.Liane> Liane,
    Ref<User.User> Member
  ) : LianeEvent;
}