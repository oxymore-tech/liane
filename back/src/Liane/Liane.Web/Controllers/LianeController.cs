using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;
using LianeMatch = Liane.Api.Community.LianeMatch;
using LianeRequest = Liane.Api.Community.LianeRequest;

namespace Liane.Web.Controllers;

[Route("api/community")]
[ApiController]
[RequiresAuth]
public sealed class LianeController(ILianeService lianeService)
  : ControllerBase
{
  [HttpGet("match")]
  public Task<ImmutableList<LianeMatch>> Match()
  {
    return lianeService.Match();
  }

  [HttpGet("match/{lianeRequestId:guid}")]
  public Task<LianeMatch> Match(Guid lianeRequestId)
  {
    return lianeService.Match(lianeRequestId);
  }
  
  [HttpPut("liane")]
  public Task<ImmutableList<Api.Community.Liane>> List([FromBody] LianeFilter filter)
  {
    return lianeService.List(filter);
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

  [HttpGet("liane/{liane:guid}/match/{from}/{to}")]
  public Task<PendingMatch?> Matches([FromRoute] Guid liane, [FromRoute] string from, [FromRoute] string to)
  {
    return lianeService.Matches(liane, from, to);
  }

  [HttpGet("liane/{liane:guid}/trip")]
  public Task<ImmutableList<WayPoint>> GetTrip(Guid liane)
  {
    return lianeService.GetTrip(liane, null);
  }

  [HttpGet("liane/{liane:guid}/trip/{lianeRequest:guid}")]
  public Task<ImmutableList<WayPoint>> GetTrip(Guid liane, Guid lianeRequest)
  {
    return lianeService.GetTrip(liane, lianeRequest);
  }

  [HttpPost("liane/{liane:guid}/join/{lianeRequest:guid}")]
  public Task<Api.Community.Liane?> JoinRequest(Guid lianeRequest, Guid liane)
  {
    return lianeService.JoinRequest(lianeRequest, liane);
  }

  [HttpPost("liane/{liane:guid}/reject/{lianeRequest:guid}")]
  public Task<bool> Reject(Guid lianeRequest, Guid liane)
  {
    return lianeService.Reject(lianeRequest, liane);
  }

  [HttpPost("liane/join_trip")]
  public Task<bool> JoinTrip([FromBody] JoinTripQuery query)
  {
    return lianeService.JoinTrip(query);
  }

  [HttpGet("liane/{id:guid}")]
  public Task<Api.Community.Liane> GetLiane(Guid id)
  {
    return lianeService.Get(id);
  }

  [HttpGet("liane/incoming_trip")]
  public Task<ImmutableDictionary<DayOfWeek, ImmutableList<IncomingTrip>>> GetIncomingTrips()
  {
    return lianeService.GetIncomingTrips();
  }

  [HttpPost("liane/{id:guid}/leave")]
  public Task<bool> Leave(Guid id)
  {
    return lianeService.Leave(id);
  }
}