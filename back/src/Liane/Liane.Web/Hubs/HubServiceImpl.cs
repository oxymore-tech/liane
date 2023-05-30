using System;
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
  private readonly MemoryCache currentConnectionsCache = new(new MemoryCacheOptions());

  public HubServiceImpl(IHubContext<ChatHub, IHubClient> hubContext, ILogger<HubServiceImpl> logger)
  {
    this.hubContext = hubContext;
    this.logger = logger;
  }

  public Priority Priority => Priority.High;

  public bool IsConnected(Ref<User> user)
  {
    return currentConnectionsCache.Get(user.Id) is not null;
  }

  public async Task<bool> SendNotification(Ref<User> recipient, Notification notification)
  {
    try
    {
      if (IsConnected(recipient)) // This is important as hub does not wait until message is received
      {
        await hubContext.Clients.Group(recipient)
          .ReceiveNotification(notification);
        return true;
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
    if (IsConnected(receiver))
    {
      try
      {
        await hubContext.Clients.Group(receiver.Id).ReceiveMessage(conversation, message);
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

  public async Task AddConnectedUser(Ref<User> user, string connectionId)
  {
    // Make mono user group to map userId and connectionId 
    // https://learn.microsoft.com/fr-fr/aspnet/signalr/overview/guide-to-the-api/mapping-users-to-connections
    await hubContext.Groups.AddToGroupAsync(connectionId, user.Id);
    currentConnectionsCache.Set(user.Id, true);
  }

  public async Task RemoveUser(Ref<User> user, string connectionId)
  {
    currentConnectionsCache.Remove(user.Id);
    await hubContext.Groups.RemoveFromGroupAsync(connectionId, user.Id);
  }
}