using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberHasLeftHandler(
  ITripService tripService,
  INotificationService notificationService,
  IUserService userService,
  ICurrentContext currentContext)
  : IEventListener<LianeEvent.MemberHasLeft>
{
  public async Task OnEvent(LianeEvent.MemberHasLeft e, Ref<Api.User.User>? sender = null)
  {
    var user = await userService.Get(e.Member);
    var liane = await tripService.Get(e.Liane);

    var destination = liane.WayPoints.Last().RallyingPoint.Label;
    await notificationService.SendEvent($"{user.Pseudo} a quitté la liane",
      $"{user.Pseudo} a quitté la liane à destination de {destination}.",
      sender ?? currentContext.CurrentUser().Id,
      liane.Driver.User, e);
  }
}