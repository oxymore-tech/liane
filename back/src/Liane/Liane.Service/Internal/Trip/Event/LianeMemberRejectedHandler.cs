using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Service.Internal.Event;
using UuidExtensions;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberRejectedHandler(IPushService pushService)
  : IEventListener<MessageContent.MemberRejected>
{
  public async Task OnEvent(LianeEvent<MessageContent.MemberRejected> e)
  {
    await pushService.Push(e.Content.User, new Notification(
      Uuid7.Guid(),
      e.Sender,
      e.At,
      "Demande déclinée",
      "Vous n'avez pas été accepté dans la liane",
      "liane://liane"
    ));
  }
}