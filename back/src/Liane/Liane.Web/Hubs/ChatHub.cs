using System;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Hub;
using Liane.Api.Notification;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Notification;
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

  public ChatHub(ILogger<ChatHub> logger, IChatService chatService, ICurrentContext currentContext, IUserService userService, IHubService hubService, INotificationService notificationService)
  {
    this.logger = logger;
    this.chatService = chatService;
    this.currentContext = currentContext;
    this.userService = userService;
    this.hubService = hubService;
    this.notificationService = notificationService;
  }

  public async Task SendToGroup(ChatMessage message, string groupId)
  {
    logger.LogInformation(message.Text);
    var sent = await chatService.SaveMessageInGroup(message, groupId, currentContext.CurrentUser().Id);
    // TODO handle notifications in service for disconnected users 
    logger.LogInformation(sent.Text + " " + currentContext.CurrentUser().Id);
    // Send created message directly to the caller, the rest of the group will be handled by chat service
    await Clients.Caller.ReceiveMessage(sent);
  }

  public async Task<ConversationGroup> JoinGroupChat(string groupId)
  {
    var userId = currentContext.CurrentUser().Id;
    // Add user to group if he is a member and update last connection date
    var nowCursor = Cursor.Now();
    var updatedConversation = await chatService.ReadAndGetConversation(groupId, userId, nowCursor.Timestamp);
    await Groups.AddToGroupAsync(Context.ConnectionId, groupId);
    logger.LogInformation("User " + userId + " joined conversation " + groupId);
    var caller = Clients.Caller;
    // Send latest messages async
    var _ = Task.Run(async () =>
    {
      var latestMessages = await chatService.GetGroupMessages(new Pagination(nowCursor), groupId);
      logger.LogInformation("Sending {count} messages", latestMessages.Data.Count);
      await caller.ReceiveLatestMessages(latestMessages);
    });
    return updatedConversation;
  }

  public Task LeaveGroupChat(string groupId)
  {
    return Groups.RemoveFromGroupAsync(Context.ConnectionId, groupId);
  }

  public override async Task OnConnectedAsync()
  {
    await base.OnConnectedAsync();
    var userId = currentContext.CurrentUser().Id;
    logger.LogInformation("User " + userId
                                  + " connected to hub with connection ID : "
                                  + Context.ConnectionId);
    hubService.AddConnectedUser(userId);
    // Get user data
    var user = await userService.GetFullUser(userId);
    await Clients.Caller.Me(user);
    // Send latest unread notifications count and conversations 
    var unreadConversationsIds = await chatService.GetUnreadConversationsIds(userId);
    var unreadNotificationsCount = await notificationService.GetUnreadCount(userId);
    await Clients.Caller.ReceiveUnreadOverview(new UnreadOverview(unreadNotificationsCount, unreadConversationsIds));
  }

  public override async Task OnDisconnectedAsync(Exception? exception)
  {
    var now = DateTime.Now;
    var userId = currentContext.CurrentUser().Id;
    hubService.RemoveUser(userId);
    await base.OnDisconnectedAsync(exception);
    await userService.UpdateLastConnection(userId, now);
  }
}