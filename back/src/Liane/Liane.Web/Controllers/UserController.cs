using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;


[Route("api/user")]
[ApiController]
[RequiresAuth]
public sealed class UserController : ControllerBase
{
  private readonly INotificationService notificationService;
  private readonly ICurrentContext currentContext;
  private readonly IUserService userService;

  public UserController(INotificationService notificationService, ICurrentContext currentContext, IUserService userService)
  {
    this.notificationService = notificationService;
    this.currentContext = currentContext;
    this.userService = userService;
  }

  [HttpGet("notification")]
  public Task<PaginatedResponse<BaseNotification>> GetNotifications([FromQuery] Pagination pagination)
  {
    return notificationService.List(currentContext.CurrentUser().Id, pagination);
  }
  
  [HttpPatch("push_token")]
  public Task UpdatePushToken([FromBody] string pushToken)
  {
    return userService.UpdatePushToken(currentContext.CurrentUser().Id, pushToken);
  }
  
  [HttpPatch("notification/{id}")]
  public Task Read([FromRoute] string id)
  {
    return notificationService.ReadNotification(id, currentContext.CurrentUser().Id);
  }
  
}