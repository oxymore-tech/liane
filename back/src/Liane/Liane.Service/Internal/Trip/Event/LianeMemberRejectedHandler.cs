using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberRejectedHandler : IEventListener<LianeEvent.MemberRejected>
{
  private readonly INotificationService notificationService;
  private readonly ICurrentContext currentContext;
  private readonly IRallyingPointService rallyingPointService;

  public LianeMemberRejectedHandler(INotificationService notificationService, ICurrentContext currentContext, IRallyingPointService rallyingPointService)
  {
    this.notificationService = notificationService;
    this.currentContext = currentContext;
    this.rallyingPointService = rallyingPointService;
  }

  public async Task OnEvent(LianeEvent.MemberRejected e, Ref<Api.User.User>? sender = null)
  {
    var destination = await rallyingPointService.Get(e.To);
    await notificationService.SendEvent("Demande déclinée",
      $"Votre demande de trajet à destination de {destination.Label} n'a pas été acceptée.", 
      sender ?? currentContext.CurrentUser().Id,
      e.Member, 
      e);
  }
}