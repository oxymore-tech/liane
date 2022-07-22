using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.SignalR;

namespace Liane.Web.Controllers;

[RequiresAuth]
public class ChatHub : Hub
{
    public ChatHub()
    {
    }

    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }

    public async Task SendMessageToCaller(string user, string message)
    {
        await Clients.Caller.SendAsync("ReceiveMessage", user, message);
    }

    public async Task SendMessageToGroup(string user, string message)
    {
        await Clients.Group("SignalR Users").SendAsync("ReceiveMessage", user, message);
    }

    public override async Task OnConnectedAsync()
    {
        //var token = Context.GetHttpContext()?.Request.Query["access_token"];
        //Console.WriteLine("CONTEXT TOKEN : " + token);
        //var principal = authService.IsTokenValid(token!);

        Console.WriteLine("CONNECTION ID : " + Context.ConnectionId);
        Console.WriteLine("USER IDENTIFIER : " + Context.UserIdentifier);
        Console.WriteLine("IS USER NULL : " + (Context.User?.FindFirst(ClaimTypes.NameIdentifier)!.Value));

        //await Groups.AddToGroupAsync(Context.ConnectionId, "SignalR Users");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        //await Groups.RemoveFromGroupAsync(Context.ConnectionId, "SignalR Users");
        await base.OnDisconnectedAsync(exception);
    }

    public Task ThrowException()
        => throw new HubException("This error will be sent to the client!");
}