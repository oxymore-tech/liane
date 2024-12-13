using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip.Geolocation;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberHasStartedHandler(ITripService tripService, ILianeTrackerService lianeTrackerService)
  : IEventListener<MessageContent.MemberHasStarted>
{
  public async Task OnEvent(LianeEvent<MessageContent.MemberHasStarted> e)
  {
    var liane = await tripService.Get(e.Content.Trip);
    await lianeTrackerService.Start(liane);
  }
}