using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Hub;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Hubs;

public sealed class HubServiceImpl : IHubService, IPushMiddleware, ILianeUpdatePushService, ILianeUpdateObserver
{
  private readonly IHubContext<ChatHub, IHubClient> hubContext;
  private readonly ILogger<HubServiceImpl> logger;
  private readonly IUserService userService;
  private readonly LianeTrackerCache trackerCache;

  public HubServiceImpl(IHubContext<ChatHub, IHubClient> hubContext, ILogger<HubServiceImpl> logger, IUserService userService, LianeTrackerCache trackerCache)
  {
    this.hubContext = hubContext;
    this.logger = logger;
    this.userService = userService;
    this.trackerCache = trackerCache;
  }

  public Priority Priority => Priority.High;

  private string? GetConnectionId(Ref<User> user)
  {
    trackerCache.CurrentConnections.TryGetValue(user.Id, out string? connectionId);
    return connectionId;
  }

  public async Task<bool> SendNotification(Ref<User> recipient, Notification notification)
  {
    try
    {
      var connectionId = GetConnectionId(recipient);
      if (connectionId is not null)
      {
        var result = await hubContext.Clients.Client(connectionId)
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
          ImmutableList.Create(new Recipient(receiver)),
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

  public Task AddConnectedUser(Ref<User> user, string connectionId)
  {
    trackerCache.CurrentConnections.Set(user.Id, connectionId);
    return Task.CompletedTask;
  }

  public Task RemoveUser(Ref<User> user, string connectionId)
  {
    trackerCache.CurrentConnections.Remove(user.Id);
    return Task.CompletedTask;
  }

  public Task<TrackedMemberLocation?> Subscribe(Ref<User> user, Ref<Api.Trip.Liane> liane, Ref<User> member)
  {
    var lastValue = trackerCache.LastPositions.Get((liane.Id, member.Id));
    return Task.FromResult(lastValue as TrackedMemberLocation);
  }

  public Task Unsubscribe(Ref<User> user, Ref<Api.Trip.Liane> liane, Ref<User> member)
  {
    return Task.CompletedTask;
  }

  public async Task Push(TrackedMemberLocation update)
  {
    trackerCache.LastPositions.Set((update.Liane.Id, update.Member.Id), update, TimeSpan.FromMinutes(60));
    if (!trackerCache.Trackers.TryGetValue(update.Liane, out var tracker))
    {
      logger.LogWarning($"No tracker for liane = '{update.Liane}'");
      return;
    }
    
    foreach (var member in tracker.Liane.Members)
    {
      var connectionId = GetConnectionId(member.User);
      if (connectionId is null)
      {
        logger.LogInformation("User '{user}' is disconnected, ping not sent : {update}", member.User, update);
        continue;
      }

      logger.LogInformation("Pushing location update to {user} : {update}", member.User, update);
      await hubContext.Clients.Client(connectionId).ReceiveLianeMemberLocationUpdate(update);
    }
  }

  public async Task Push(Api.Trip.Liane liane, Ref<User> recipient)
  {
    var connectionId = GetConnectionId(recipient);
    if (connectionId is not null)
    {
      logger.LogInformation("Pushing liane update to {user} : {update}", recipient, liane);
      await hubContext.Clients.Client(connectionId).ReceiveLianeUpdate(liane);
    }
  }
  
  public async Task PushUserUpdate(FullUser user)
  {
    var connectionId = GetConnectionId(user.Id!);
    if (connectionId is not null)
    {
      logger.LogInformation("Pushing update to {user}", user.Id!);
      await hubContext.Clients.Client(connectionId).Me(user);
    }
  }
}