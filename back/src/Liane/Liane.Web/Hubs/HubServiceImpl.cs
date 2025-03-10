using System;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Hub;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip.Geolocation;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Hubs;

public sealed class HubServiceImpl(
  IHubContext<ChatHub, IHubClient> hubContext,
  ILogger<HubServiceImpl> logger,
  ILianeTrackerCache trackerCache,
  ILianeMessageService lianeMessageService
) : IHubService, IPushMiddleware, ILianeUpdatePushService
{
  private MemoryCache CurrentConnections { get; } = new(new MemoryCacheOptions());

  public Priority Priority => Priority.High;

  private string? GetConnectionId(Ref<User> user)
  {
    CurrentConnections.TryGetValue(user.Id, out string? connectionId);
    return connectionId;
  }

  public async Task<bool> Push(Ref<User> recipient, Notification notification)
  {
    if (notification.CreatedBy is not null)
    {
      await SendUnreadOverview(notification.CreatedBy);
    }

    await SendUnreadOverview(recipient);

    return false;
  }

  public async Task<bool> PushMessage(User sender, Ref<User> receiver, Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    var connectionId = GetConnectionId(receiver);
    if (connectionId is not null)
    {
      try
      {
        await hubContext.Clients.Client(connectionId).ReceiveLianeMessage(liane, message);
        return false;
      }
      catch (Exception e)
      {
        logger.LogWarning(e, "Could not send liane message to user {receiver}", receiver);
        return false;
      }
    }

    logger.LogInformation("{receiver} is disconnected", receiver);
    return false;
  }

  public Task AddConnectedUser(Ref<User> user, string connectionId)
  {
    CurrentConnections.Set(user.Id, connectionId);
    return Task.CompletedTask;
  }

  public Task RemoveUser(Ref<User> user)
  {
    CurrentConnections.Remove(user.Id);
    return Task.CompletedTask;
  }

  public Task<TrackingInfo?> GetLastTrackingInfo(Ref<Trip> liane)
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

  public async Task PushUserUpdate(FullUser user)
  {
    var connectionId = GetConnectionId(user.Id!);
    if (connectionId is not null)
    {
      logger.LogInformation("Pushing update to {user}", user.Id!);
      await hubContext.Clients.Client(connectionId).Me(user);
    }
  }

  public async Task PushLianeUpdateTo(Guid? lianeOrRequest, Ref<User> recipient)
  {
    var connectionId = GetConnectionId(recipient);
    if (connectionId is not null)
    {
      logger.LogInformation("Pushing liane update to {user} : {update}", recipient, lianeOrRequest);
      await hubContext.Clients.Client(connectionId).ReceiveLianeUpdate(lianeOrRequest);
    }
  }

  public async Task PushTripUpdateTo(Trip trip, Ref<User> recipient)
  {
    var connectionId = GetConnectionId(recipient);
    if (connectionId is not null)
    {
      logger.LogInformation("Pushing trip update to {user} : {update}", recipient, trip);
      await hubContext.Clients.Client(connectionId).ReceiveTripUpdate(trip);
    }
  }

  private async Task SendUnreadOverview(Ref<User> recipient)
  {
    try
    {
      var connectionId = GetConnectionId(recipient);
      if (connectionId is not null)
      {
        var unreadNotificationsIds = await lianeMessageService.GetUnreadLianes();
        await hubContext.Clients.Client(connectionId).ReceiveUnreadOverview(unreadNotificationsIds);
      }
    }
    catch (Exception e)
    {
      // TODO handle retry 
      logger.LogWarning(e, "Could not send notification to user {receiver} : {error}", recipient, e.Message);
    }
  }
}