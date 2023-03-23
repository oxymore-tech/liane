using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

[Union]
public abstract record LianeEvent(Ref<Trip.Liane> Liane)
{


  public sealed record JoinRequest(
    Ref<Trip.Liane> Liane,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip,
    string Message
  ) : LianeEvent(Liane);

  public sealed record MemberAccepted(
    Ref<Trip.Liane> Liane,
    Ref<User.User> Member,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip
  ) : LianeEvent(Liane);

  public sealed record MemberRejected(Ref<Trip.Liane> Liane, 
    Ref<User.User> Member) : LianeEvent(Liane);

  public sealed record MemberHasLeft(Ref<Trip.Liane> Liane) : LianeEvent(Liane);
}