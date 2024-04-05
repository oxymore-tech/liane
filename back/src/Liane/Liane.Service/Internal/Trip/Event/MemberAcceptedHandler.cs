using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class MemberAcceptedHandler(
  ITripService tripService,
  INotificationService notificationService,
  ICurrentContext currentContext)
  : IEventListener<TripEvent.MemberAccepted>
{
  public async Task OnEvent(TripEvent.MemberAccepted e, Ref<Api.Auth.User>? sender = null)
  {
    var liane = await tripService.Get(e.Trip);
    var destination = liane.WayPoints.First(w => w.RallyingPoint.Id! == e.To).RallyingPoint.Label;
    await notificationService.SendEvent("Demande acceptée",
      "Vous avez rejoint la liane à destination de " + destination + ".",
      sender ?? currentContext.CurrentUser().Id,
      e.Member,
      e);
  }
}