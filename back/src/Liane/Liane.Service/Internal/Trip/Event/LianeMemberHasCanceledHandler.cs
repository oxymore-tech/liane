using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Event;

public class LianeMemberHasCanceledHandler : IEventListener<LianeEvent.MemberHasCanceled>
{
  private readonly ILianeService lianeService;

  public LianeMemberHasCanceledHandler(ILianeService lianeService)
  {
    this.lianeService = lianeService;
  }

  public async Task OnEvent(LianeEvent.MemberHasCanceled lianeEvent, Ref<Api.User.User>? sender = null)
  {
    var liane = await lianeService.Get(lianeEvent.Liane);
    if (lianeEvent.Member == liane.Driver.User)
    {
      // Cancel trip
      await lianeService.UpdateState(liane, LianeState.Canceled);
    }
    else
    {
     // TODO
    }
    // TODO notify driver / passengers 
  }
}
