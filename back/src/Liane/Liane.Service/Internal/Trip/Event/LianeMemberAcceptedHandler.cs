using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberAcceptedHandler : IEventListener<LianeEvent.MemberAccepted>
{
  private readonly ILianeService lianeService;
  private readonly INotificationService notificationService;

  public LianeMemberAcceptedHandler(ILianeService lianeService, INotificationService notificationService)
  {
    this.lianeService = lianeService;
    this.notificationService = notificationService;
  }

  public async Task OnEvent(LianeEvent.MemberAccepted e)
  {
    var member = new LianeMember(e.Member, e.From, e.To, e.TakeReturnTrip, e.Seats);
    await lianeService.AddMember(e.Liane, member);
    await notificationService.Notify("Demande acceptée", "Vous avez rejoint une nouvelle Liane !", e.Member, e);
  }
}