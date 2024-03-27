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
public sealed class LianeMemberHasCanceledHandler(
  ITripService tripService,
  IUserService userService,
  INotificationService notificationService,
  ICurrentContext currentContext)
  : IEventListener<LianeEvent.MemberHasCanceled>
{
  public async Task OnEvent(LianeEvent.MemberHasCanceled e, Ref<Api.User.User>? sender = null)
  {
    var liane = await tripService.Get(e.Liane);
    var user = await userService.Get(e.Member);

    if (liane.Driver.User == e.Member.Id)
    {
      // Driver canceled 
      await Parallel.ForEachAsync(liane.Members.Where(m => m.Cancellation is null && m.User != liane.Driver.User), async (member, _) =>
      {
        var destination = liane.WayPoints.Find(w => w.RallyingPoint.Id! == member.To)!.RallyingPoint.Label;
        await notificationService.SendEvent($"{user.Pseudo} a quitté la liane",
          $"{user.Pseudo} a annulé la liane à destination de {destination}.",
          sender ?? currentContext.CurrentUser().Id,
          member.User, e);
      });
    }
    else
    {
      // A passenger canceled
      var destination = liane.WayPoints.Last().RallyingPoint.Label;
      await notificationService.SendEvent($"{user.Pseudo} a quitté la liane",
        $"{user.Pseudo} a annulé sa participation à la liane à destination de {destination}.",
        sender ?? currentContext.CurrentUser().Id,
        liane.Driver.User, e);
    }
  }
}