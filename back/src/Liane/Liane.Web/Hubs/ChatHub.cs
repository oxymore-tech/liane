using System;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Task = System.Threading.Tasks.Task;

namespace Liane.Web.Hubs;

[Authorize(Policy = Startup.RequireAuthPolicy)]
public sealed class ChatHub : Hub
{
  private readonly ILogger<ChatHub> logger;
  private readonly IChatService chatService;
  private readonly ICurrentContext currentContext;
  private readonly IUserService userService;
  private readonly MemoryCache currentConnectionsCache = new(new MemoryCacheOptions());

  private const string ReceiveMessage = nameof(ReceiveMessage);
  private const string GetLatestMessages = nameof(GetLatestMessages);
  private const string Me = nameof(Me);

  public ChatHub(ILogger<ChatHub> logger, IChatService chatService, ICurrentContext currentContext, IUserService userService)
  {
    this.logger = logger;
    this.chatService = chatService;
    this.currentContext = currentContext;
    this.userService = userService;
  }

  public bool IsConnected(Ref<User> user)
  {
    return currentConnectionsCache.Get(user.Id) != null;
  }

  public async Task SendToGroup(ChatMessage message, string groupId)
  {
    var sent = await chatService.SaveMessageInGroup(message, groupId, currentContext.CurrentUser().Id);
    // TODO handle notifications in service for disconnected users 
    await Clients.Group(groupId).SendAsync(ReceiveMessage, sent);
  }

  public async Task<ConversationGroup> JoinGroupChat(string groupId)
  {
    var userId = currentContext.CurrentUser().Id;
    // Add user to group if he is a member and update last connection date
    var nowCursor = DatetimeCursor.Now();
    var updatedConversation = await chatService.ReadAndGetConversation(groupId, userId, nowCursor.Timestamp);
    await Groups.AddToGroupAsync(Context.ConnectionId, groupId);

    // Send latest messages async
    Task.Run(async () =>
    {
      var latestMessages = await chatService.GetGroupMessages(
        new PaginatedRequestParams<DatetimeCursor>(nowCursor), groupId);
      await Clients.Caller.SendAsync(GetLatestMessages, latestMessages);
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
    currentConnectionsCache.CreateEntry(userId);
    // Update User's last connection
    var user = userService.UpdateLastConnection(userId, DateTime.Now);
    await Clients.Caller.SendAsync(Me, user);
    // TODO send latest unread notifications count 
  }

  public override async Task OnDisconnectedAsync(Exception? exception)
  {
    currentConnectionsCache.Remove(currentContext.CurrentUser().Id);
    await base.OnDisconnectedAsync(exception);
  }
}