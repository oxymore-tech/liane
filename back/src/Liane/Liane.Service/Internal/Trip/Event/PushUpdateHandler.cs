using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Service.Internal.Community;
using Liane.Service.Internal.Event;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class PushUpdateHandler(
  ITripService tripService,
  LianeFetcher lianeFetcher,
  IHubService hubService
) : IEventListener
{
  public async Task OnEvent(LianeEvent<MessageContent> e)
  {
    if (e.PublishTripUpdate is not null)
    {
      var trip = await e.PublishTripUpdate.Resolve(tripService.Get);
      foreach (var member in trip.Members)
      {
        await hubService.PushTripUpdateTo(trip, member.User);
      }
    }

    if (!e.PublishLianeUpdate)
    {
      return;
    }

    var liane = await e.Liane.Resolve(i => lianeFetcher.Get(i.IdAsGuid()));
    foreach (var member in liane.Members)
    {
      await hubService.PushLianeUpdateTo(liane, member.User);
    }
  }
}