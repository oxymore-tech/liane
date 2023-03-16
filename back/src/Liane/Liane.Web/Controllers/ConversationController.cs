using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Web.Internal.AccessLevel;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/conversation")]
[ApiController]
[RequiresAuth]
public sealed class ConversationController : ControllerBase
{
  private readonly IChatService chatService;

  public ConversationController(IChatService chatService)
  {
    this.chatService = chatService;
  }

  [HttpGet("{id}/message")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(ConversationGroup))]
  public Task<PaginatedResponse<ChatMessage>> GetPaginatedMessages([FromRoute] string id, [FromQuery] Pagination pagination)
  {
    return chatService.GetGroupMessages(pagination, id);
  }
}