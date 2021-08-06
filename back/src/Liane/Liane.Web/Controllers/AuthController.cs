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
        public Task SendSms([FromQuery] string phone)
        {
            return authService.SendSms(phone);
        }

        [HttpPost("login")]
        [DisableAuth]
        public Task<AuthUser> Login([FromQuery] string phone, [FromQuery] string code, [FromQuery] string? token)
        {
            return authService.Login(phone, code, token);
        }

        [HttpGet("me")]
        public Task<AuthUser> Me()
        {
            return authService.Me();
        }
    }
}