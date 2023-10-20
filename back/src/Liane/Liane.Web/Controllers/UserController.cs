using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/user")]
[ApiController]
[RequiresAuth]
public sealed class UserController : ControllerBase
{
  private readonly ICurrentContext currentContext;
  private readonly IUserService userService;
  private readonly IDeleteAccountService deleteAccountService;

  public UserController(ICurrentContext currentContext, IUserService userService, IDeleteAccountService deleteAccountService)
  {
    this.currentContext = currentContext;
    this.userService = userService;
    this.deleteAccountService = deleteAccountService;
  }

  [HttpPatch("push_token")]
  public Task UpdatePushToken([FromBody] string pushToken)
  {
    return userService.UpdatePushToken(currentContext.CurrentUser().Id, pushToken);
  }

  [HttpPatch]
  public Task<FullUser> UpdateInfo([FromBody] UserInfo info)
  {
    return userService.UpdateInfo(currentContext.CurrentUser().Id, info);
  }

  [HttpDelete]
  public Task Delete()
  {
    return deleteAccountService.DeleteCurrent();
  }
}