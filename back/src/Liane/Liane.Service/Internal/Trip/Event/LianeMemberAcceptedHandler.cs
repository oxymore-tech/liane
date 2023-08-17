using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberAcceptedHandler : IEventListener<LianeEvent.MemberAccepted>
{
  private readonly ILianeService lianeService; 
  private readonly INotificationService notificationService;
  private readonly ICurrentContext currentContext;

  public LianeMemberAcceptedHandler(ILianeService lianeService, INotificationService notificationService, ICurrentContext currentContext)
  {
    this.lianeService = lianeService;
    this.notificationService = notificationService;
    this.currentContext = currentContext;
  }

  public async Task OnEvent(LianeEvent.MemberAccepted e, Ref<Api.User.User>? sender = null)
  {
    var member = new LianeMember(e.Member, e.From, e.To, e.Seats);
    var liane = await lianeService.AddMember(e.Liane, member);
    if (e.TakeReturnTrip)
    {
      await lianeService.AddMember(liane.Return!, member);
    }
    var destination = liane.WayPoints.First(w => w.RallyingPoint.Id! == e.To).RallyingPoint.Label;
    await notificationService.SendEvent("Demande acceptée", 
      "Vous avez rejoint la liane à destination de "+destination+".", 
      sender ?? currentContext.CurrentUser().Id,
      e.Member, 
      e);
  }
}