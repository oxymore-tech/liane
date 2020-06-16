using System.Threading.Tasks;
using Liane.Api;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api")]
    [ApiController]
    public class CommonController : ControllerBase
    {
        private readonly IExampleService exampleService;

        public CommonController(IExampleService exampleService)
        {
            this.exampleService = exampleService;
        }

        [HttpGet("example")]
        public async Task<ActionResult<object>> GetListItems()
        {
            return await exampleService.ExampleMethod();
        }
    }
}