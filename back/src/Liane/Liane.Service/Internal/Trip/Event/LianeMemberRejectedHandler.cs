using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Community;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberRejectedHandler(
  INotificationService notificationService,
  ICurrentContext currentContext,
  LianeRequestFetcher lianeRequestFetcher)
  : IEventListener<LianeEvent.MemberRejected>
{
  public async Task OnEvent(LianeEvent.MemberRejected e, Ref<Api.Auth.User>? sender = null)
  {
    var lianeRequest = await lianeRequestFetcher.Get(e.LianeRequest.IdAsGuid());
    await notificationService.Notify(
      sender ?? currentContext.CurrentUser().Id,
      e.User,
      "Demande déclinée",
      $"Votre demande pour rejoindre la liane n'a pas été acceptée pour '{lianeRequest.Name}'",
      $"liane://liane/{lianeRequest.Id}"
    );
  }
}