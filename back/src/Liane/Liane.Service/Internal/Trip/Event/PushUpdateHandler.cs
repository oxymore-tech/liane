using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
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

    var receivers = await GetReceivers(e);
    foreach (var receiver in receivers)
    {
      await hubService.PushLianeUpdateTo(e.Liane.IdAsGuid(), receiver);
    }
  }

  private async Task<IEnumerable<Ref<Api.Auth.User>>> GetReceivers(LianeEvent<MessageContent> lianeEvent)
  {
    if (lianeEvent.Liane is Ref<Api.Community.Liane>.Resolved r)
    {
      return GetReceivers(r.Value, lianeEvent.Content);
    }

    var liane = await lianeFetcher.TryGet(lianeEvent.Liane.IdAsGuid());
    return liane is null
      ? ImmutableList<Ref<Api.Auth.User>>.Empty
      : GetReceivers(liane, lianeEvent.Content);
  }

  private static IEnumerable<Ref<Api.Auth.User>> GetReceivers(Api.Community.Liane liane, MessageContent content)
  {
    var users = liane.Members.Select(m => m.User).ToHashSet();
    if (content is IUserTargeted addressedTo)
    {
      users.Add(addressedTo.User);
    }

    return users;
  }
}