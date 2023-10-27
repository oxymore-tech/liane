using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberHasLeftHandler : IEventListener<LianeEvent.MemberHasLeft>
{
  private readonly ILianeService lianeService;
  private readonly IUserService userService;
  private readonly INotificationService notificationService;
  private readonly ICurrentContext currentContext;

  public LianeMemberHasLeftHandler(ILianeService lianeService, INotificationService notificationService, IUserService userService, ICurrentContext currentContext)
  {
    this.lianeService = lianeService;
    this.notificationService = notificationService;
    this.userService = userService;
    this.currentContext = currentContext;
  }

  public async Task OnEvent(LianeEvent.MemberHasLeft e, Ref<Api.User.User>? sender = null)
  {
    var user = await userService.Get(e.Member);
    var liane = await lianeService.Get(e.Liane);
   
      var destination = liane.WayPoints.Last().RallyingPoint.Label;
      await notificationService.SendEvent($"{user.Pseudo} a quitté la liane",
        $"{user.Pseudo} a quitté la liane à destination de {destination}.",
        sender ?? currentContext.CurrentUser().Id,
        liane.Driver.User, e);
    
  }
}