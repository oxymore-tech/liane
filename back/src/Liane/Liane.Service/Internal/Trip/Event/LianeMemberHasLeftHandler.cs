using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberHasLeftHandler : IEventListener<LianeEvent.MemberHasLeft>
{
  private readonly ILianeService lianeService; 
  private readonly IUserService userService; 
  private readonly INotificationService notificationService;

  public LianeMemberHasLeftHandler(ILianeService lianeService, INotificationService notificationService, IUserService userService)
  {
    this.lianeService = lianeService;
    this.notificationService = notificationService;
    this.userService = userService;
  }

  public async Task OnEvent(LianeEvent.MemberHasLeft e)
  {
    var user = await userService.Get(e.Member);
    var liane = await lianeService.RemoveMember(e.Liane, e.Member);
    if (liane is not null)
    {
      var destination = liane.WayPoints.Last().RallyingPoint.Label;
      await notificationService.SendEvent(user.Pseudo+" a quitté la liane", user.Pseudo+" a quitté la liane à destination de "+destination, liane.Driver.User, e);
    }
  }
}