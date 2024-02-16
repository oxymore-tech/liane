using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Trip.Geolocation;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberHasStartedHandler(
  ITripService tripService,
  ILianeRequestService lianeRequestService,
  ILianeTrackerService lianeTrackerService)
  : IEventListener<LianeEvent.MemberHasStarted>
{
  public async Task OnEvent(LianeEvent.MemberHasStarted e, Ref<Api.User.User>? sender = null)
  {
    var liane = await tripService.Get(e.Liane);
    await lianeTrackerService.Start(liane);

    if (liane.Driver.User == e.Member.Id)
    {
      // Driver started 
      await lianeRequestService.RejectJoinLianeRequests(new[] { (Ref<Api.Trip.Trip>)e.Liane.Id });

      // TODO notify other carpoolers ?
    }
  }
}