using System;
using Liane.Api.Auth;
using Liane.Api.Community;
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

  public sealed record JoinRequest(
    Ref<Community.Liane> Liane,
    Ref<LianeRequest> LianeRequest,
    string Message
  ) : LianeEvent;

  public sealed record ChangeDepartureTimeRequest(
    Ref<Trip.Trip> Liane,
    Ref<RallyingPoint> From,
    DateTime At
  ) : LianeEvent;

  public sealed record MemberAccepted(
    Ref<Community.Liane> Liane,
    Ref<LianeRequest> LianeRequest,
    Ref<User> Member
  ) : LianeEvent;

  public sealed record MemberRejected(
    Ref<Community.Liane> Liane,
    Ref<LianeRequest> LianeRequest,
    Ref<User> User,
    string? Reason
  ) : LianeEvent;

  public sealed record MemberPing(
    Ref<Trip.Trip> Liane,
    long Timestamp,
    TimeSpan? Delay,
    LatLng? Coordinate = null
  ) : LianeEvent;

  public sealed record MemberHasCanceled(
    Ref<Trip.Trip> Liane,
    Ref<User> Member
  ) : LianeEvent;

  public sealed record MemberHasStarted(
    Ref<Trip.Trip> Liane,
    Ref<User> Member
  ) : LianeEvent;
}