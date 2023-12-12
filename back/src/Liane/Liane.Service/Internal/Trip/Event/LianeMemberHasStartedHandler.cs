using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Trip.Geolocation;

namespace Liane.Service.Internal.Trip.Event;

public class LianeMemberHasStartedHandler : IEventListener<LianeEvent.MemberHasStarted>
{
  private readonly ILianeService lianeService;
  private readonly ILianeRequestService lianeRequestService;
  private readonly ILianeTrackerService lianeTrackerService;
  public LianeMemberHasStartedHandler(ILianeService lianeService, ILianeRequestService lianeRequestService, ILianeTrackerService lianeTrackerService)
  {
    this.lianeService = lianeService;
    this.lianeRequestService = lianeRequestService;
    this.lianeTrackerService = lianeTrackerService;
  }

  public async Task OnEvent(LianeEvent.MemberHasStarted e, Ref<Api.User.User>? sender = null)
  {
    var liane = await lianeService.Get(e.Liane);
    await lianeTrackerService.Start(liane);
    
    if (liane.Driver.User == e.Member.Id)
    {
      // Driver started 
      await lianeRequestService.RejectJoinLianeRequests(new []{(Ref<Api.Trip.Liane>)e.Liane.Id});
      
      // TODO notify other carpoolers ?
    }

  }
}
