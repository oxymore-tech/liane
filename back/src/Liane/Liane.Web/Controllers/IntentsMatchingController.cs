using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Grouping;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/trip_intent/match")]
[ApiController]
[RequiresAuth]
public class IntentsMatchingController : ControllerBase
{
    private readonly IIntentMatchingService intentMatchingService;

    public IntentsMatchingController(IIntentMatchingService intentMatchingService)
    {
        this.intentMatchingService = intentMatchingService;
    }

    [HttpGet("")]
    public async Task<List<MatchedTripIntent>> GetMatches()
    {
        return await intentMatchingService.GetMatchedGroups();
    }
}