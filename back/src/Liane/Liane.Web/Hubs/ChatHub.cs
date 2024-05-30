using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Hub;
using Liane.Api.Trip;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
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
  IChatService chatService,
  ILianeService lianeService,
  ICurrentContext currentContext,
  IUserService userService,
  IHubService hubService,
  INotificationService notificationService,
  EventDispatcher eventDispatcher,
  ILianeUpdatePushService lianeUpdatePushService)
  : Hub<IHubClient>
{
  public async Task PostEvent(LianeEvent lianeEvent)
  {
    await eventDispatcher.Dispatch(lianeEvent);
  }

  public async Task PostAnswer(string notificationId, Answer answer)
  {
    await notificationService.Answer(notificationId, answer);
  }

  public async Task SendToLiane(MessageContent lianeMessage, string lianeId)
  {
    var sent = await lianeService.SendMessage(lianeId, lianeMessage);
    await Clients.Caller.ReceiveLianeMessage(lianeId, sent);
  }

  public async Task<Api.Community.Liane> JoinLianeChat(string lianeId)
  {
    var userId = currentContext.CurrentUser().Id;
    var liane = await lianeService.Get(lianeId);
    logger.LogInformation("User '{userId}' joined liane chat '{lianeId}'", userId, lianeId);
    var caller = Clients.Caller;
    _ = Task.Run(async () =>
    {
      var latestMessages = await lianeService.GetMessages(lianeId);
      logger.LogInformation("Sending {count} liane messages", latestMessages.Data.Count);
      await caller.ReceiveLatestLianeMessages(latestMessages);
    });
    return liane;
  }
  
  public async Task ReadLiane(string lianeId, DateTime timestamp)
  {
    await lianeService.MarkAsRead(lianeId);
  }

  public async Task SendToGroup(ChatMessage message, string groupId)
  {
    var sent = await chatService.SaveMessageInGroup(message, groupId, currentContext.CurrentUser().Id);
    logger.LogInformation(sent.Text + " " + currentContext.CurrentUser().Id);
    // Send created message directly to the caller, the rest of the group will be handled by chat service
    await Clients.Caller.ReceiveGroupMessage(groupId, sent);
  }

  public async Task<ConversationGroup> JoinGroupChat(string groupId)
  {
    var userId = currentContext.CurrentUser().Id;
    // Add user to group if he is a member and update last connection date
    var nowCursor = Cursor.Now();
    var updatedConversation = await chatService.ReadAndGetConversation(groupId, userId, nowCursor.Timestamp);
    logger.LogInformation("User '{userId}' joined conversation '{groupId}'", userId, groupId);
    var caller = Clients.Caller;
    // Send latest messages async
    _ = Task.Run(async () =>
    {
      var latestMessages = await chatService.GetGroupMessages(new Pagination(nowCursor), groupId);
      logger.LogInformation("Sending {count} messages", latestMessages.Data.Count);
      await caller.ReceiveLatestGroupMessages(latestMessages);
    });
    return updatedConversation;
  }

  public async Task ReadGroup(string convId, DateTime timestamp)
  {
    var userId = currentContext.CurrentUser().Id;
    await chatService.ReadConversation(convId, userId, timestamp);
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
    // Send latest unread notifications count and conversations 
    var unreadConversationsIds = await chatService.GetUnreadConversationsIds(userId);
    var unreadNotificationsIds = await notificationService.GetUnread(userId);
    await Clients.Caller.ReceiveUnreadOverview(new UnreadOverview(unreadNotificationsIds, unreadConversationsIds));
  }

  public override async Task OnDisconnectedAsync(Exception? exception)
  {
    var now = DateTime.Now;
    var userId = currentContext.CurrentUser().Id;
    logger.LogInformation(exception, "User '{user}' disconnect from hub", userId);
    await hubService.RemoveUser(userId, Context.ConnectionId);
    await base.OnDisconnectedAsync(exception);
    await userService.UpdateLastConnection(userId, now);
  }

  public async Task<TrackingInfo?> GetLastTrackingInfo(string lianeId)
  {
    return await lianeUpdatePushService.GetLastTrackingInfo(lianeId);
  }

  public async Task ReadNotifications(IEnumerable<Ref<Notification>> notifications)
  {
    await notificationService.MarkAsRead(notifications);
  }
}