using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Grouping;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/match_intents")]
[ApiController]
[RequiresAuth]
public class IntentsMatchingController : ControllerBase
{
    private readonly IIntentsMatchingService intentsMatching;
    
    public IntentsMatchingController(IIntentsMatchingService intentsMatching)
    {
        this.intentsMatching = intentsMatching;
    }

    [HttpGet("")]
    public async Task<List<MatchedTripIntent>> GetMatches()
    {
        return await intentsMatching.GetMatchedGroups();
    }
}