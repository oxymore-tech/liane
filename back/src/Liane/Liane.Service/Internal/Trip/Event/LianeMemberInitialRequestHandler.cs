using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Service.Internal.Community;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberInitialRequestHandler(
  INotificationService notificationService,
  IUserService userService,
  LianeRequestFetcher lianeRequestFetcher) : IEventListener<MessageContent.MemberRequested>
{
  public async Task OnEvent(LianeEvent<MessageContent.MemberRequested> e)
  {
    var lianeRequest = await e.Content.LianeRequest.Resolve(i => lianeRequestFetcher.Get(i.IdAsGuid()));
    var sender = await e.Sender.Resolve(userService.Get);
    await notificationService.Notify(
      e.At,
      e.Sender,
      e.Content.User,
      "Demande reçu",
      $"{sender.Pseudo} souhaite rejoindre votre liane {lianeRequest.Name}",
      $"liane://liane/{e.Liane.Id}"
    );
  }
}