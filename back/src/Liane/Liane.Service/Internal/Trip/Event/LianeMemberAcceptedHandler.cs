using System.Linq;
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
    var liane = await lianeService.AddMember(e.Liane, member);
    var destination = liane.WayPoints.First(w => w.RallyingPoint.Id! == e.To).RallyingPoint.Label;
    await notificationService.SendEvent("Demande acceptée", "Vous avez rejoint la liane à destination de "+destination+".", e.Member, e);
  }
}