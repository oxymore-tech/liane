using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/auth")]
[ApiController]
[RequiresAuth]
public sealed class AuthController : ControllerBase
{
  private readonly IAuthService authService;
  private readonly ICurrentContext currentContext;

  public AuthController(IAuthService authService, ICurrentContext currentContext)
  {
    this.authService = authService;
    this.currentContext = currentContext;
  }
  
  [HttpPost("sms")]
  [DisableAuth]
  public Task SendSms([FromQuery] string phone)
  {
    return authService.SendSms(phone);
  }

  [HttpPost("login")]
  [DisableAuth]
  public Task<AuthResponse> Login([FromBody] AuthRequest request)
  {
    return authService.Login(request);
  }

  [HttpPost("token")]
  [DisableAuth]
  public Task<AuthResponse> RefreshToken([FromBody] RefreshTokenRequest request)
  {
    return authService.RefreshToken(request);
  }

  [HttpPost("logout")]
  public Task Logout()
  {
    return authService.Logout(currentContext.CurrentUser().Id);
  }
}