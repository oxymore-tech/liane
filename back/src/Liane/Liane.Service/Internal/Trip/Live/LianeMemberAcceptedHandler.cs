using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberAcceptedHandler : IEventListener<LianeEvent.MemberAccepted>
{
  private readonly ILianeService lianeService;

  public LianeMemberAcceptedHandler(ILianeService lianeService)
  {
    this.lianeService = lianeService;
  }

  public Task OnEvent(Api.Event.Event e, LianeEvent.MemberAccepted memberAccepted, Api.Event.Event? answersToEvent)
  {
    var member = new LianeMember(memberAccepted.Member, memberAccepted.From, memberAccepted.To, memberAccepted.TakeReturnTrip, memberAccepted.Seats);
    return lianeService.AddMember(memberAccepted.Liane, member);
  }
}