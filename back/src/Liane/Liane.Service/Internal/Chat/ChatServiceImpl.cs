using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Util.Http;

namespace Liane.Service.Internal.Chat;

public class ChatServiceImpl : IChatService
{
    private readonly ICurrentContext currentContext;

    public ChatServiceImpl(ICurrentContext currentContext)
    {
        this.currentContext = currentContext;
    }
    
    public async Task Echo(WebSocket webSocket)
    {
        var buffer = new byte[1024 * 4];
        var receiveResult = await webSocket.ReceiveAsync(
            new ArraySegment<byte>(buffer), CancellationToken.None);
        
        while (!receiveResult.CloseStatus.HasValue)
        {
            await webSocket.SendAsync(
                new ArraySegment<byte>(buffer, 0, receiveResult.Count),
                receiveResult.MessageType,
                receiveResult.EndOfMessage,
                CancellationToken.None);

            Console.WriteLine(currentContext.CurrentUser().Phone + " SENT " + Encoding.UTF8.GetString(buffer, 0, receiveResult.Count)); ////

            receiveResult = await webSocket.ReceiveAsync(
                new ArraySegment<byte>(buffer), CancellationToken.None);
        }

        await webSocket.CloseAsync(
            receiveResult.CloseStatus.Value,
            receiveResult.CloseStatusDescription,
            CancellationToken.None);
    }
}