using System;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Hub;
using Liane.Api.Trip;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Util;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Connections.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Task = System.Threading.Tasks.Task;

namespace Liane.Web.Hubs;

[Authorize(Policy = Startup.RequireAuthPolicy)]
public sealed class ChatHub(
  ILogger<ChatHub> logger,
  ILianeMessageService lianeMessageService,
  ICurrentContext currentContext,
  IUserService userService,
  IHubService hubService,
  ILianeUpdatePushService lianeUpdatePushService)
  : Hub<IHubClient>
{
  public Task SendToLiane(MessageContent lianeMessage, string lianeId)
  {
    _ = Task.Run(() => lianeMessageService.SendMessage(lianeId, lianeMessage));
    return Task.CompletedTask;
  }

  public Task ReadLiane(string lianeId, DateTime timestamp)
  {
    _ = Task.Run(() => lianeMessageService.MarkAsRead(lianeId, timestamp));
    return Task.CompletedTask;
  }

  public override async Task OnConnectedAsync()
  {
    await base.OnConnectedAsync();
    var userId = currentContext.CurrentUser().Id;
    var protocol = Context.Features.Get<IHttpTransportFeature>()?.TransportType.ToString();
    logger.LogInformation("User '{userId}' connected to hub with connection ID '{ConnectionId}' using '{Protocol}'", userId, Context.ConnectionId, protocol);
    await hubService.AddConnectedUser(userId, Context.ConnectionId);
    // Get user data
    var user = await userService.TryGetFullUser(userId);
    if (user is null)
    {
      // Throw if user does not exist (ex: account was deleted but a token is still in use)
      throw new UnauthorizedAccessException();
    }

    await Clients.Caller.Me(user);
    var unreadNotificationsIds = await lianeMessageService.GetUnreadLianes();
    await Clients.Caller.ReceiveUnreadOverview(unreadNotificationsIds);
  }

  public override async Task OnDisconnectedAsync(Exception? exception)
  {
    var now = DateTime.Now;
    var userId = currentContext.CurrentUser().Id;
    logger.LogInformation(exception, "User '{user}' disconnect from hub", userId);
    await hubService.RemoveUser(userId);
    await base.OnDisconnectedAsync(exception);
    await userService.UpdateLastConnection(userId, now);
  }

  public async Task<TrackingInfo?> GetLastTrackingInfo(string lianeId)
  {
    return await lianeUpdatePushService.GetLastTrackingInfo(lianeId);
  }
  
  public async Task AskForOverview()
  {
    var unreadNotificationsIds = await lianeMessageService.GetUnreadLianes();
    await Clients.Caller.ReceiveUnreadOverview(unreadNotificationsIds);
  }
}