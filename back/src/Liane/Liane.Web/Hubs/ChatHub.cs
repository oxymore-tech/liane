using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Hub;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Util;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Task = System.Threading.Tasks.Task;

namespace Liane.Web.Hubs;

[Authorize(Policy = Startup.RequireAuthPolicy)]
public sealed class ChatHub : Hub<IHubClient>
{
  private readonly ILogger<ChatHub> logger;
  private readonly IChatService chatService;
  private readonly ICurrentContext currentContext;
  private readonly IUserService userService;
  private readonly IHubService hubService;
  private readonly INotificationService notificationService;
  private readonly EventDispatcher eventDispatcher;
  private readonly ILianeMemberTracker lianeMemberTracker;

  public ChatHub(ILogger<ChatHub> logger, IChatService chatService, ICurrentContext currentContext, IUserService userService, IHubService hubService, INotificationService notificationService,
    EventDispatcher eventDispatcher, ILianeMemberTracker lianeMemberTracker)
  {
    this.logger = logger;
    this.chatService = chatService;
    this.currentContext = currentContext;
    this.userService = userService;
    this.hubService = hubService;
    this.notificationService = notificationService;
    this.eventDispatcher = eventDispatcher;
    this.lianeMemberTracker = lianeMemberTracker;
  }

  public async Task PostEvent(LianeEvent lianeEvent)
  {
    await eventDispatcher.Dispatch(lianeEvent);
  }

  public async Task PostAnswer(string notificationId, Answer answer)
  {
    await notificationService.Answer(notificationId, answer);
  }

  public async Task SendToGroup(ChatMessage message, string groupId)
  {
    var sent = await chatService.SaveMessageInGroup(message, groupId, currentContext.CurrentUser().Id);
    logger.LogInformation(sent.Text + " " + currentContext.CurrentUser().Id);
    // Send created message directly to the caller, the rest of the group will be handled by chat service
    await Clients.Caller.ReceiveMessage(groupId, sent);
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
      await caller.ReceiveLatestMessages(latestMessages);
    });
    return updatedConversation;
  }

  public async Task ReadConversation(string convId, DateTime timestamp)
  {
    var userId = currentContext.CurrentUser().Id;
    await chatService.ReadConversation(convId, userId, timestamp);
  }

  public override async Task OnConnectedAsync()
  {
    await base.OnConnectedAsync();
    var userId = currentContext.CurrentUser().Id;
    logger.LogInformation("User {userId} connected to hub with connection ID : {ConnectionId}", userId, Context.ConnectionId);
    await hubService.AddConnectedUser(userId, Context.ConnectionId);
    // Get user data
    var user = await userService.GetFullUser(userId);
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
    await hubService.RemoveUser(userId, Context.ConnectionId);
    await base.OnDisconnectedAsync(exception);
    await userService.UpdateLastConnection(userId, now);
  }

  public async Task<TrackedMemberLocation?> SubscribeToLocationsUpdates(string lianeId, string memberId)
  {
    var userId = currentContext.CurrentUser().Id;
    return await lianeMemberTracker.Subscribe(userId, lianeId, memberId);
  }
  
  public async Task UnsubscribeFromLocationsUpdates(string lianeId, string memberId)
  {
    var userId = currentContext.CurrentUser().Id;
    await lianeMemberTracker.Unsubscribe(userId, lianeId, memberId);
  }

  public async Task ReadNotifications(IEnumerable<Ref<Notification>> notifications)
  {
    await notificationService.MarkAsRead(notifications);
  }
}