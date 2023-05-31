using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberRejectedHandler : IEventListener<LianeEvent.MemberRejected>
{
  private readonly ILianeService lianeService; 
  private readonly INotificationService notificationService;

  public LianeMemberRejectedHandler(ILianeService lianeService, INotificationService notificationService)
  {
    this.lianeService = lianeService;
    this.notificationService = notificationService;
  }

  public async Task OnEvent(LianeEvent.MemberRejected e)
  {
    var liane = await lianeService.Get(e.Liane);
    var destination = liane.WayPoints.First(w => w.RallyingPoint.Id! == e.To).RallyingPoint.Label;
    await notificationService.SendEvent("Demande déclinée", "Votre demande de trajet à destination de "+destination+" n'a pas été acceptée.", e.Member, e);
  }
}