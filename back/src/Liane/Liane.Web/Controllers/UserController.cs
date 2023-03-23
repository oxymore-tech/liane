using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Event;
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
  private readonly INotificationService notificationService;

  public UserController(ICurrentContext currentContext, IUserService userService, INotificationService notificationService)
  {
    this.currentContext = currentContext;
    this.userService = userService;
    this.notificationService = notificationService;
  }

  [HttpGet("notification")]
  public Task<PaginatedResponse<Notification>> GetNotifications([FromQuery] Pagination pagination)
  {
    return notificationService.List(pagination);
  }

  [HttpPatch("push_token")]
  public Task UpdatePushToken([FromBody] string pushToken)
  {
    return userService.UpdatePushToken(currentContext.CurrentUser().Id, pushToken);
  }
}