using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;
using LianeRequest = Liane.Api.Community.LianeRequest;

namespace Liane.Web.Controllers;

[Route("api/community")]
[ApiController]
[RequiresAuth]
public sealed class CommunityController(ILianeService lianeService)
  : ControllerBase
{
  [HttpGet("liane")]
  public Task<ImmutableList<LianeMatch>> List()
  {
    return lianeService.List();
  }

  [HttpPost("liane")]
  public async Task<LianeRequest> Create([FromBody] LianeRequest request)
  {
    return await lianeService.Create(request);
  }

  [HttpPost("liane/request/{id:guid}")]
  public Task UpdateRequest(Guid id, [FromBody] LianeRequest request)
  {
    return lianeService.Update(id, request);
  }

  [HttpDelete("liane/request/{id:guid}")]
  public Task DeleteRequest(Guid id)
  {
    return lianeService.Delete(id);
  }

  [HttpPost("liane/{id:guid}/join/{liane:guid}")]
  public Task Join(Guid id, Guid liane)
  {
    return lianeService.JoinRequest(id, liane);
  }

  [HttpPost("liane/join_trip")]
  public Task JoinTrip([FromBody] JoinTripQuery query)
  {
    return lianeService.JoinTrip(query);
  }

  [HttpGet("liane/{id:guid}")]
  public Task<Api.Community.Liane> GetLiane(Guid id)
  {
    return lianeService.Get(id);
  }

  [HttpPost("liane/{id:guid}/leave")]
  public Task<bool> Leave(Guid id)
  {
    return lianeService.Leave(id);
  }

  [HttpGet("liane/{id:guid}/message")]
  public Task<PaginatedResponse<LianeMessage>> GetMessages(Guid id, [FromQuery] Pagination pagination)
  {
    return lianeService.GetMessages(id, pagination);
  }

  [HttpPost("liane/{id:guid}/message")]
  public Task<LianeMessage> SendMessage(Guid id, [FromBody] MessageContent content)
  {
    return lianeService.SendMessage(id, content);
  }

  [HttpGet("liane/unread")]
  public Task<ImmutableDictionary<Ref<Api.Community.Liane>, int>> GetUnreadLianes()
  {
    return lianeService.GetUnreadLianes();
  }
}