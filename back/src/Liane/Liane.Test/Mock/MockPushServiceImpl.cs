using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using NUnit.Framework;

namespace Liane.Test.Mock;

public sealed class MockPushServiceImpl : IPushMiddleware
{
  public Priority Priority => Priority.High;

  private readonly List<SentMessage> sent = new();
  private readonly List<SentMessage> messages = new();

  public Task<bool> Push(Ref<User> receiver, Notification notification)
  {
    sent.Add(new SentMessage(notification.CreatedAt!.Value, receiver.Id, notification.Message));
    return Task.FromResult(true);
  }

  public Task<bool> PushMessage(User sender, Ref<User> receiver, Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    messages.Add(new SentMessage(message.CreatedAt!.Value, receiver.Id, message.Content.Value ?? ""));
    return Task.FromResult(true);
  }

  public DateTime[] Assert(params (string? To, string Message)[] msgs)
  {
    CollectionAssert.AreEqual(
      sent
        .OrderBy(s => s.At)
        .Select(s => (s.To, s.Message)),
      msgs
    );
    return sent
      .OrderBy(s => s.At)
      .Select(s => s.At)
      .ToArray();
  }
  
  public DateTime[] AssertMessage(params (string? To, string Message)[] msgs)
  {
    CollectionAssert.AreEqual(
      messages
        .OrderBy(s => s.At)
        .Select(s => (s.To, s.Message)),
      msgs
    );
    return messages
      .OrderBy(s => s.At)
      .Select(s => s.At)
      .ToArray();
  }
}

internal sealed record SentMessage(DateTime At, string To, string Message);