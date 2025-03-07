using System;
using System.Collections.Concurrent;
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

  private readonly ConcurrentBag<SentMessage> sent = [];
  private readonly ConcurrentBag<SentMessage> messages = [];

  public Task<bool> Push(Ref<User> receiver, Notification notification)
  {
    sent.Add(new SentMessage(notification.Id, notification.CreatedAt!.Value, receiver.Id, notification.Message));
    return Task.FromResult(true);
  }

  public Task<bool> PushMessage(User sender, Ref<User> receiver, Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    messages.Add(new SentMessage(message.Id, message.CreatedAt!.Value, receiver.Id, message.Content.Value ?? ""));
    return Task.FromResult(true);
  }

  public void AssertNoPush()
  {
    CollectionAssert.IsEmpty(sent);
  }

  public DateTime[] AssertPush(string? to, params string[] msgs)
  {
    Task.Delay(200).Wait();
    CollectionAssert.AreEqual(
      sent
        .Where(s => s.To == to)
        .OrderBy(s => s.At)
        .ThenBy(s => s.Id)
        .Select(s => s.Message)
        .ToArray(),
      msgs
    );
    return sent
      .Where(s => s.To == to)
      .OrderBy(s => s.At)
      .ThenBy(s => s.Id)
      .Select(s => s.At)
      .ToArray();
  }

  public DateTime[] AssertMessage(string? to, params string[] msgs)
  {
    Task.Delay(200).Wait();
    CollectionAssert.AreEqual(
      messages
        .Where(s => s.To == to)
        .OrderBy(s => s.At)
        .ThenBy(s => s.Id)
        .Select(s => s.Message)
        .ToArray(),
      msgs
    );
    return messages
      .Where(s => s.To == to)
      .OrderBy(s => s.At)
      .ThenBy(s => s.Id)
      .Select(s => s.At)
      .ToArray();
  }
}

internal sealed record SentMessage(Guid Id, DateTime At, string To, string Message);