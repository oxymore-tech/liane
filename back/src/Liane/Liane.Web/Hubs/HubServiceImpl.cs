using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Hub;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Hubs;

public sealed class HubServiceImpl : IHubService, IPushMiddleware
{
  private readonly IHubContext<ChatHub, IHubClient> hubContext;
  private readonly ILogger<HubServiceImpl> logger;
  private readonly IUserService userService;
  private readonly MemoryCache currentConnectionsCache = new(new MemoryCacheOptions());

  public HubServiceImpl(IHubContext<ChatHub, IHubClient> hubContext, ILogger<HubServiceImpl> logger, IUserService userService)
  {
    this.hubContext = hubContext;
    this.logger = logger;
    this.userService = userService;
  }

  public Priority Priority => Priority.High;

  public string? GetConnectionId(Ref<User> user)
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
        if (!result)
        {
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
        
        return true;

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

  public async Task AddConnectedUser(Ref<User> user, string connectionId)
  {
    // Make mono user group to map userId and connectionId 
    // https://learn.microsoft.com/fr-fr/aspnet/signalr/overview/guide-to-the-api/mapping-users-to-connections
   // await hubContext.Groups.AddToGroupAsync(connectionId, user.Id);
    currentConnectionsCache.Set(user.Id, connectionId);
  }

  public async Task RemoveUser(Ref<User> user, string connectionId)
  {
    currentConnectionsCache.Remove(user.Id);
  //  await hubContext.Groups.RemoveFromGroupAsync(connectionId, user.Id);
  }
}