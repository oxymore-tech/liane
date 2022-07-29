using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Util;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Web.Hubs;

[Authorize(Policy = Startup.ChatAuthorizationPolicy)]
public class ChatHub : Hub
{
    private readonly ILogger<LianeTripServiceImpl> logger;
    private IChatService chatService;

    private const string ReceiveMessage = "ReceiveMessage";

    public ChatHub(ILogger<LianeTripServiceImpl> logger, IChatService chatService)
    {
        this.logger = logger;
        this.chatService = chatService;
    }

    // Send message to every existing client/group
    private async Task Send(string user, string message)
    {
        await Clients.All.SendAsync(ReceiveMessage, user, message);
    }
    
    // Reply to caller
    private async Task SendToCaller(string user, string message)
    {
        await Clients.Caller.SendAsync(ReceiveMessage, user, message);
    }

    public async Task SendToGroup(ChatMessage message, string groupId)
    {
        await chatService.SaveMessageInGroup(message, groupId);
        await Clients.Group(groupId).SendAsync(ReceiveMessage, message);
    }

    public async Task<ImmutableList<ChatMessage>> JoinGroupChat(string groupId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupId);
        return await chatService.GetGroupConversation(groupId);
    }

    public Task LeaveGroupChat(string groupId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, groupId);
    }

    public override async Task OnConnectedAsync()
    {
        logger.LogInformation("User " + Context.User?.Identity?.Name
                                      + " connected to hub with connection ID : " 
                                      + Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }

    public Task ThrowException()
    {
        throw new HubException("This error will be sent to the client!");
    }
}