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
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip,
    string Message
  ) : LianeEvent;

  public sealed record NewMember(
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    int Seats,
    bool TakeReturnTrip
  ) : LianeEvent;

  public sealed record MemberRejected : LianeEvent;

  public sealed record MemberHasLeft : LianeEvent;
}