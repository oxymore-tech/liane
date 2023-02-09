using System;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Web.Internal.AccessLevel;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/conversations")]
[ApiController]
[RequiresAuth]
public class ConversationsController : ControllerBase
{
  
  private readonly IChatService chatService;

  public ConversationsController(IChatService chatService)
  {
    this.chatService = chatService;
  }
  
  [HttpGet("{id}/messages")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public Task<PaginatedResponse<ChatMessage, DatetimeCursor>> GetPaginatedMessages( [FromRoute] string id, [FromQuery] int? limit, [FromQuery] string? cursor)
  {
    return chatService.GetGroupMessages(new PaginatedRequestParams<DatetimeCursor>(cursor ?? new DatetimeCursor(DateTime.Now), limit ?? 25), id);
  }
}