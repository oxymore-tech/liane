using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/auth")]
    [ApiController]
    [RequiresAuth]
    public sealed class AuthController : ControllerBase
    {
        private readonly IAuthService authService;

        public AuthController(IAuthService authService)
        {
            this.authService = authService;
        }

        [HttpPost("sms")]
        [DisableAuth]
        public Task SendSms([FromQuery] string number)
        {
            return authService.SendSms(number);
        }

        [HttpPost("login")]
        [DisableAuth]
        public Task<string> Login([FromQuery] string number, [FromQuery] string code, [FromQuery] string token)
        {
            return authService.Login(number, code, token);
        }

        [HttpPost("me")]
        public Task<AuthUser> Me()
        {
            return authService.Me();
        }
    }
}