using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Chat;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;

namespace Liane.Test.Mock;

public sealed class MockPushServiceImpl : IPushMiddleware
{
  public Priority Priority => Priority.High;


  private Dictionary<string, List<Notification>> sent = new();

  public Task<bool> SendNotification(Ref<User> receiver, Notification notification)
  {
    var found = sent.TryGetValue(receiver.Id, out var v);
    if (found)
    {
      sent[receiver.Id] = v!.Concat(new List<Notification> { notification }).ToList();
    }
    else sent[receiver.Id] = new List<Notification> { notification };

    return Task.FromResult(true);
  }

  public ImmutableList<Notification> GetSentNotifications(Ref<User> receiver)
  {
    return sent[receiver.Id].ToImmutableList();
  }

  public Task<bool> SendChatMessage(Ref<User> receiver, Ref<ConversationGroup> conversation, ChatMessage message)
  {
    return Task.FromResult(true);
  }

  public Task<bool> SendLianeMessage(Ref<User> receiver, Ref<Api.Community.Liane> conversation, LianeMessage message)
  {
    return Task.FromResult(true);
  }
}