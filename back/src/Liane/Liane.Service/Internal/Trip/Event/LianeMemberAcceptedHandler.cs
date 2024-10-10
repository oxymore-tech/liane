using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberAcceptedHandler(
  INotificationService notificationService,
  ICurrentContext currentContext)
  : IEventListener<LianeEvent.MemberAccepted>
{
  public async Task OnEvent(LianeEvent.MemberAccepted e, Ref<Api.Auth.User>? sender = null)
  {
    await notificationService.Notify(
      sender ?? currentContext.CurrentUser().Id,
      e.Member,
      "Demande acceptée",
      "Vous avez été accepté dans la liane",
      $"liane://liane/{e.Liane.Id}"
    );
  }
}