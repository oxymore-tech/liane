using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("ws")]
[ApiController]
[RequiresAuth]
public class WebSocketController : ControllerBase
{
    private readonly IChatService chatService;
    // Collection of messages for each group (of group intents / of persons)

    public WebSocketController(IChatService chatService)
    {
        this.chatService = chatService;
    }
    
    [HttpGet("")]
    public async Task Get()
    {
        if (HttpContext.WebSockets.IsWebSocketRequest)
        {
            using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
            await chatService.Echo(webSocket);
        }
        else
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }
}