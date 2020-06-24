using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Response;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api")]
    [ApiController]
    public class CommonController : ControllerBase
    {
        private readonly IOsrmService _osrmService;

        public CommonController(IOsrmService osrmService)
        {
            this._osrmService = osrmService;
        }

        [HttpGet("example")]
        public async Task<ActionResult<Routing>> GetListItems()
        {
            return await _osrmService.RouteMethod();
        }
    }
}