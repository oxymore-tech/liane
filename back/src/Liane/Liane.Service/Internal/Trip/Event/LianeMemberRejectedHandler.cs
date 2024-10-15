using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Event;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberRejectedHandler(INotificationService notificationService)
  : IEventListener<MessageContent.MemberRejected>
{
  public async Task OnEvent(LianeEvent<MessageContent.MemberRejected> e)
  {
    await notificationService.Notify(
      e.At,
      e.Sender,
      e.Content.User,
      "Demande déclinée",
      "Vous n'avez pas été accepté dans la liane",
      $"liane://liane/{e.Liane.Id}"
    );
  }
}