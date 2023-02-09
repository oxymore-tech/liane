using System;
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
public sealed class ConversationsController : ControllerBase
{
  private readonly IChatService chatService;

  public ConversationsController(IChatService chatService)
  {
    this.chatService = chatService;
  }

  [HttpGet("{id}/message")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(ConversationGroup))]
  public Task<PaginatedResponse<ChatMessage, DatetimeCursor>> GetPaginatedMessages([FromRoute] string id, [FromQuery] int? limit, [FromQuery] string? cursor)
  {
    return chatService.GetGroupMessages(new Pagination<DatetimeCursor>(cursor ?? new DatetimeCursor(DateTime.Now), limit ?? 25), id);
  }
}