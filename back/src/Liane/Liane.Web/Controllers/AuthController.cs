using System.Threading.Tasks;
using Liane.Api.User;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public sealed class AuthController : ControllerBase
    {
        private readonly IAuthService authService;

        public AuthController(IAuthService authService)
        {
            this.authService = authService;
        }

        [HttpPost("sms")]
        public Task SendSms([FromQuery] string number)
        {
            return authService.SendSms(number);
        }
    }
}