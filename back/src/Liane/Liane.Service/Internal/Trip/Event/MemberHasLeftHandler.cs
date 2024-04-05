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
public sealed class MemberHasLeftHandler(
  ITripService tripService,
  INotificationService notificationService,
  IUserService userService,
  ICurrentContext currentContext)
  : IEventListener<TripEvent.MemberHasLeft>
{
  public async Task OnEvent(TripEvent.MemberHasLeft e, Ref<Api.Auth.User>? sender = null)
  {
    var user = await userService.Get(e.Member);
    var liane = await tripService.Get(e.Trip);

    var destination = liane.WayPoints.Last().RallyingPoint.Label;
    await notificationService.SendEvent($"{user.Pseudo} a quitté la liane",
      $"{user.Pseudo} a quitté la liane à destination de {destination}.",
      sender ?? currentContext.CurrentUser().Id,
      liane.Driver.User, e);
  }
}