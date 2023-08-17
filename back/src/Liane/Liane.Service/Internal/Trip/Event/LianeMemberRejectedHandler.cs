using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberRejectedHandler : IEventListener<LianeEvent.MemberRejected>
{
  private readonly ILianeService lianeService; 
  private readonly INotificationService notificationService;
  private readonly ICurrentContext currentContext;

  public LianeMemberRejectedHandler(ILianeService lianeService, INotificationService notificationService, ICurrentContext currentContext)
  {
    this.lianeService = lianeService;
    this.notificationService = notificationService;
    this.currentContext = currentContext;
  }

  public async Task OnEvent(LianeEvent.MemberRejected e, Ref<Api.User.User>? sender = null)
  {
    var liane = await lianeService.Get(e.Liane);
    var destination = liane.WayPoints.First(w => w.RallyingPoint.Id! == e.To).RallyingPoint.Label;
    await notificationService.SendEvent("Demande déclinée", 
      "Votre demande de trajet à destination de "+destination+" n'a pas été acceptée.", 
      sender ?? currentContext.CurrentUser().Id,
      e.Member, 
      e);
  }
}