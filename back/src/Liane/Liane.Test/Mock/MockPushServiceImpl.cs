using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;

namespace Liane.Test.Mock;

public sealed class MockPushServiceImpl : IPushMiddleware
{
  public Priority Priority => Priority.High;

  private readonly Dictionary<string, List<Notification>> sent = new();

  public Task<bool> Push(Ref<User> receiver, Notification notification)
  {
    var found = sent.TryGetValue(receiver.Id, out var v);
    if (found)
    {
      sent[receiver.Id] = v!.Concat(new List<Notification> { notification }).ToList();
    }
    else sent[receiver.Id] = [notification];

    return Task.FromResult(true);
  }

  public Task<bool> PushMessage(User sender, Ref<User> receiver, Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    return Task.FromResult(true);
  }
}