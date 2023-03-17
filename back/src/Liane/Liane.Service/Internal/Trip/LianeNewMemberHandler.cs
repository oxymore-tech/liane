using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Trip;

public sealed class LianeNewMemberHandler : IEventListener<LianeEvent.NewMember>
{
  private readonly ILianeService lianeService;

  public LianeNewMemberHandler(ILianeService lianeService)
  {
    this.lianeService = lianeService;
  }

  public Task OnEvent(Api.Event.Event e, LianeEvent.NewMember newMember, Api.Event.Event? answersToEvent)
  {
    var member = new LianeMember(e.CreatedBy, newMember.From, newMember.To, newMember.TakeReturnTrip, newMember.Seats);
    return lianeService.AddMember(newMember.Liane, member);
  }
}