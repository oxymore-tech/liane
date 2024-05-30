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

  [HttpPost("liane/request/{id}")]
  public Task UpdateRequest(string id, [FromBody] LianeRequest request)
  {
    return lianeService.Update(id, request);
  }

  [HttpDelete("liane/request/{id}")]
  public Task DeleteRequest(string id)
  {
    return lianeService.Delete(id);
  }

  [HttpPost("liane/{id}/join_new/{lianeRequest}")]
  public Task<Api.Community.Liane> JoinNew(string id, string lianeRequest)
  {
    return lianeService.JoinNew(id, lianeRequest);
  }

  [HttpPost("liane/{id}/join/{liane}")]
  public Task<Api.Community.Liane> Join(string id, string liane)
  {
    return lianeService.Join(id, liane);
  }

  [HttpPost("liane/{id}")]
  public Task Update(string id, [FromBody] LianeUpdate lianeUpdate)
  {
    return lianeService.Update(id, lianeUpdate);
  }

  [HttpGet("liane/{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Community.Liane))]
  public Task<Api.Community.Liane> GetRequest(string id)
  {
    return lianeService.Get(id);
  }

  [HttpPost("liane/{id}/leave")]
  public Task<bool> Leave(string id)
  {
    return lianeService.Leave(id);
  }

  [HttpGet("liane/{id}/message")]
  public Task<PaginatedResponse<LianeMessage>> GetMessages(string id, [FromQuery] Pagination pagination)
  {
    return lianeService.GetMessages(id, pagination);
  }

  [HttpPost("liane/{id}/message")]
  public Task<LianeMessage> SendMessage(string id, [FromBody] MessageContent content)
  {
    return lianeService.SendMessage(id, content);
  }

  [HttpGet("liane/unread")]
  public Task<ImmutableDictionary<Ref<Api.Community.Liane>, int>> GetUnreadLianes()
  {
    return lianeService.GetUnreadLianes();
  }
}
