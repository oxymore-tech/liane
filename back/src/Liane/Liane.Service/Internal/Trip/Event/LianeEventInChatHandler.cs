using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Event;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeEventInChatHandler(ILianeMessageService messageService) : IEventListener
{
  public Task OnEvent(LianeEvent<MessageContent> e) => messageService.SendMessage(e.Liane, e.Content, e.At);
}