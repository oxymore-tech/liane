using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class MemberRejectedHandler(
  INotificationService notificationService,
  ICurrentContext currentContext,
  IRallyingPointService rallyingPointService)
  : IEventListener<TripEvent.MemberRejected>
{
  public async Task OnEvent(TripEvent.MemberRejected e, Ref<Api.Auth.User>? sender = null)
  {
    var destination = await rallyingPointService.Get(e.To);
    await notificationService.SendEvent("Demande déclinée",
      $"Votre demande de trajet à destination de {destination.Label} n'a pas été acceptée.",
      sender ?? currentContext.CurrentUser().Id,
      e.Member,
      e);
  }
}