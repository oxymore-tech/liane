using System;
using System.Threading.Tasks;
using Liane.Api.Hub;
using Liane.Api.Notification;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Notification;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Hubs;

public sealed class HubServiceImpl : IHubService
{
  private readonly IHubContext<ChatHub, IHubClient> hubContext;
  private readonly ILogger<HubServiceImpl> logger;
  private readonly MemoryCache currentConnectionsCache = new(new MemoryCacheOptions());

  public HubServiceImpl(IHubContext<ChatHub, IHubClient> hubContext, ILogger<HubServiceImpl> logger)
  {
    this.hubContext = hubContext;
    this.logger = logger;
  }

  public bool IsConnected(Ref<User> user)
  {
    return currentConnectionsCache.Get(user.Id) != null;
  }

  public async Task<bool> TrySendNotification(Ref<User> receiver, BaseNotification notification)
  {
    if (IsConnected(receiver))
    {
      try
      {
        await hubContext.Clients.User(receiver).ReceiveNotification(notification);
        return true;
      }
      catch (Exception e)
      {
        // TODO handle retry 
        logger.LogInformation("Could not send notification to user {receiver} : {error}", receiver, e.Message);
      }
    }

    return false;
  }

  public void AddConnectedUser(Ref<User> user)
  {
    currentConnectionsCache.CreateEntry(user.Id);
  }

  public void RemoveUser(Ref<User> user)
  {
    currentConnectionsCache.Remove(user.Id);
  }
}