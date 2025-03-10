using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/community")]
[ApiController]
[RequiresAuth]
public sealed class LianeMessageController(ILianeMessageService lianeMessageService)
  : ControllerBase
{
  [HttpGet("liane/{id:guid}/message")]
  public Task<PaginatedResponse<LianeMessage>> GetMessages(Guid id, [FromQuery] Pagination pagination)
  {
    return lianeMessageService.GetMessages(id, pagination);
  }

  [HttpPost("liane/{id:guid}/message")]
  public Task<LianeMessage?> SendMessage(Guid id, [FromBody] MessageContent content)
  {
    return lianeMessageService.SendMessage(id, content);
  }

  [HttpGet("liane/unread")]
  public Task<ImmutableDictionary<Ref<LianeRequest>, int>> GetUnreadLianes()
  {
    return lianeMessageService.GetUnreadLianes();
  }
}