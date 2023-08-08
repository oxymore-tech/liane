using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Hub;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Hubs;

public sealed class HubServiceImpl : IHubService, IPushMiddleware, ILianeMemberTracker
{
  private readonly IHubContext<ChatHub, IHubClient> hubContext;
  private readonly ILogger<HubServiceImpl> logger;
  private readonly IUserService userService;
  private readonly MemoryCache currentConnectionsCache = new(new MemoryCacheOptions());
  // TODO periodically clean disconnected users and outdated pairs (string Liane, string Member)
  private readonly ConcurrentDictionary<(string Liane, string Member), HashSet<string>> locationTrackers = new ();
  private readonly MemoryCache lastValueCache = new(new MemoryCacheOptions());

  public HubServiceImpl(IHubContext<ChatHub, IHubClient> hubContext, ILogger<HubServiceImpl> logger, IUserService userService)
  {
    this.hubContext = hubContext;
    this.logger = logger;
    this.userService = userService;
  }

  public Priority Priority => Priority.High;

  private string? GetConnectionId(Ref<User> user)
  {
    currentConnectionsCache.TryGetValue(user.Id, out string? connectionId);
    return connectionId;
  }

  public async Task<bool> SendNotification(Ref<User> recipient, Notification notification)
  {
    try
    {
      var connectionId = GetConnectionId(recipient);
      if (connectionId is not null) 
      {
        var result =  await hubContext.Clients.Client(connectionId)
          .ReceiveNotification(notification);
        return result;
      }
    }
    catch (Exception e)
    {
      // TODO handle retry 
      logger.LogWarning(e, "Could not send notification to user {receiver} : {error}", recipient, e.Message);
    }

    return false;
  }

  public async Task<bool> SendChatMessage(Ref<User> receiver, Ref<ConversationGroup> conversation, ChatMessage message)
  {
    var connectionId = GetConnectionId(receiver);
    if (connectionId is not null) 
    {
      try
      {
        var result = await hubContext.Clients.Client(connectionId).ReceiveMessage(conversation, message);
        if (result) return true;
        var sender = await userService.Get(message.CreatedBy!);
        var notification = new Notification.NewMessage(
          null,
          sender,
          message.CreatedAt!.Value,
          ImmutableList.Create(new Recipient(receiver, null)),
          ImmutableHashSet<Answer>.Empty,
          sender.Pseudo,
          message.Text,
          conversation.Id);
        return await SendNotification(receiver, notification);

      }
      catch (Exception e)
      {
        // TODO handle retry 
        logger.LogInformation("Could not send message to user {receiver} : {error}", receiver, e.Message);
      }
    }

    logger.LogInformation("{receiver} is disconnected", receiver);
    return false;
  }

  public bool IsConnected(Ref<User> user)
  {
    return GetConnectionId(user) is not null;
  }

  public  Task AddConnectedUser(Ref<User> user, string connectionId)
  {
    // Make mono user group to map userId and connectionId 
    // https://learn.microsoft.com/fr-fr/aspnet/signalr/overview/guide-to-the-api/mapping-users-to-connections

    currentConnectionsCache.Set(user.Id, connectionId);
    return Task.CompletedTask;
  }

  public Task RemoveUser(Ref<User> user, string connectionId)
  {
    currentConnectionsCache.Remove(user.Id);
    return Task.CompletedTask;
  
  }

  public async Task<TrackedMemberLocation?>  Subscribe(Ref<User> user, Ref<Api.Trip.Liane> liane, Ref<User> member)
  {
    locationTrackers.AddOrUpdate((liane.Id, member.Id), _ => new HashSet<string> { user }, (_, set) =>
    {
       set.Add(user);
       return set;
    });
    var lastValue = lastValueCache.Get((member.Id, member.Id));
    return lastValue is not TrackedMemberLocation update ? null : update;
  }

  public async Task Unsubscribe(Ref<User> user, Ref<Api.Trip.Liane> liane, Ref<User> member)
  {
    var set = locationTrackers[(liane.Id, member.Id)];
    set.Remove(user);
    if (set.Count == 0) locationTrackers.Remove((liane.Id, member.Id), out _);
  }

  public async Task Push(TrackedMemberLocation update)
  {
    lastValueCache.Set((update.Liane.Id, update.Member.Id), update, TimeSpan.FromMinutes(10));
    var contained = locationTrackers.TryGetValue((update.Liane, update.Member), out var list);
    if (!contained) return;
    foreach (var userId in list!)
    {
      var connectionId = GetConnectionId(userId);
      if (connectionId is not null)
      {
        await hubContext.Clients.Client(connectionId).ReceiveLianeMemberLocationUpdate(update);
      }
    }
  }
}