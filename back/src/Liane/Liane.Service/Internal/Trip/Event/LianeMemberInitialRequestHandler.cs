using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Service.Internal.Community;
using Liane.Service.Internal.Event;
using UuidExtensions;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberInitialRequestHandler(
  IPushService pushService,
  IUserService userService,
  LianeRequestFetcher lianeRequestFetcher) : IEventListener<MessageContent.MemberRequested>
{
  public async Task OnEvent(LianeEvent<MessageContent.MemberRequested> e)
  {
    var liane = await lianeRequestFetcher.Get(e.Liane.IdAsGuid());
    var sender = await e.Sender.Resolve(userService.Get);
    await pushService.Push(
      liane.CreatedBy!,
      new Notification(
        Uuid7.Guid(),
        e.Sender,
        e.At,
        "Demande reçu",
        $"{sender.Pseudo} souhaite rejoindre votre liane {liane.Name}",
        $"liane://liane/{e.Liane.Id}"
      )
    );
  }
}