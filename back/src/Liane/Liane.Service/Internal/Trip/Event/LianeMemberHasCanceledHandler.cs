using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberHasCanceledHandler(
  ITripService tripService,
  IUserService userService,
  INotificationService notificationService,
  ICurrentContext currentContext)
  : IEventListener<LianeEvent.MemberHasCanceled>
{
  public async Task OnEvent(LianeEvent.MemberHasCanceled e, Ref<Api.Auth.User>? sender = null)
  {
    var liane = await tripService.Get(e.Liane);
    var user = await userService.Get(e.Member);

    await Parallel.ForEachAsync(liane.Members.Where(m => m.Cancellation is null && m.User != e.Member.Id), async (member, _) =>
    {
      var destination = liane.WayPoints.Find(w => w.RallyingPoint.Id! == member.To)!.RallyingPoint.Label;
      await notificationService.Notify(
        sender ?? currentContext.CurrentUser().Id,
        member.User,
        $"{user.Pseudo} a quitté le trajet",
        $"{user.Pseudo} a quitté le trajet à destination de {destination}.",
        $"liane://trip/{liane.Id}"
      );
    });
  }
}