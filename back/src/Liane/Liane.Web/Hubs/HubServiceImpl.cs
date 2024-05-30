using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Hub;
using Liane.Api.Trip;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip.Geolocation;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Hubs;

public sealed class HubServiceImpl : IHubService, IPushMiddleware, ILianeUpdatePushService, ILianeUpdateObserver
{
  private readonly IHubContext<ChatHub, IHubClient> hubContext;
  private readonly ILogger<HubServiceImpl> logger;
  private readonly IUserService userService;
  private readonly ILianeTrackerCache trackerCache;
  private MemoryCache CurrentConnections { get; } = new(new MemoryCacheOptions());

  public HubServiceImpl(IHubContext<ChatHub, IHubClient> hubContext, ILogger<HubServiceImpl> logger, IUserService userService, ILianeTrackerCache trackerCache)
  {
    this.hubContext = hubContext;
    this.logger = logger;
    this.userService = userService;
    this.trackerCache = trackerCache;
  }

  public Priority Priority => Priority.High;

  private string? GetConnectionId(Ref<User> user)
  {
    CurrentConnections.TryGetValue(user.Id, out string? connectionId);
    return connectionId;
  }

  public async Task<bool> SendNotification(Ref<User> recipient, Notification notification)
  {
    try
    {
      var connectionId = GetConnectionId(recipient);
      if (connectionId is not null)
      {
        return await hubContext.Clients.Client(connectionId)
          .ReceiveNotification(notification);
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
        var result = await hubContext.Clients.Client(connectionId).ReceiveGroupMessage(conversation, message);
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
    CurrentConnections.Set(user.Id, connectionId);
    return Task.CompletedTask;
  }

  public Task RemoveUser(Ref<User> user, string connectionId)
  {
    CurrentConnections.Remove(user.Id);
    return Task.CompletedTask;
  }

  public Task<TrackingInfo?> GetLastTrackingInfo(Ref<Api.Trip.Trip> liane)
  {
    var lastValue = trackerCache.GetTracker(liane)?.GetTrackingInfo();
    return Task.FromResult(lastValue);
  }

  public async Task Push(TrackingInfo update, Ref<User> user)
  {
      var connectionId = GetConnectionId(user);
      if (connectionId is null)
      {
        logger.LogInformation("User '{user}' is disconnected, tracking info not sent : {update}", user, update);
        return;
      }

      logger.LogInformation("Pushing tracking info to {user} : {update}", user, update);
      await hubContext.Clients.Client(connectionId).ReceiveTrackingInfo(update);
    }
  

  public async Task Push(Api.Trip.Trip trip, Ref<User> recipient)
  {
    var connectionId = GetConnectionId(recipient);
    if (connectionId is not null)
    {
      logger.LogInformation("Pushing liane update to {user} : {update}", recipient, trip);
      await hubContext.Clients.Client(connectionId).ReceiveLianeUpdate(trip);
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