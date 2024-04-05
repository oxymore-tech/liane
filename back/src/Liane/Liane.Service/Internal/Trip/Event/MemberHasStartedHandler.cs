using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Trip.Geolocation;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class MemberHasStartedHandler(
  ITripService tripService,
  IJoinRequestService joinRequestService,
  ITripTrackerService tripTrackerService)
  : IEventListener<TripEvent.MemberHasStarted>
{
  public async Task OnEvent(TripEvent.MemberHasStarted e, Ref<Api.Auth.User>? sender = null)
  {
    var liane = await tripService.Get(e.Trip);
    await tripTrackerService.Start(liane);

    if (liane.Driver.User == e.Member.Id)
    {
      // Driver started 
      await joinRequestService.RejectJoinRequests(new[] { (Ref<Api.Trip.Trip>)e.Trip.Id });

      // TODO notify other carpoolers ?
    }
  }
}