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

  public sealed record NewMember(
    Ref<Trip.Liane> Liane,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip
  ) : LianeEvent;

  public sealed record MemberRejected(Ref<Trip.Liane> Liane) : LianeEvent;

  public sealed record MemberHasLeft(Ref<Trip.Liane> Liane) : LianeEvent;
}