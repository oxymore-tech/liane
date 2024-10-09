using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Trip.Geolocation;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberHasStartedHandler(ITripService tripService, ILianeTrackerService lianeTrackerService)
  : IEventListener<LianeEvent.MemberHasStarted>
{
  public async Task OnEvent(LianeEvent.MemberHasStarted e, Ref<Api.Auth.User>? sender = null)
  {
    var liane = await tripService.Get(e.Liane);
    await lianeTrackerService.Start(liane);
  }
}