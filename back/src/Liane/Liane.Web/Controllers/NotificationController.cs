using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/notification")]
[ApiController]
[RequiresAuth]
public sealed class NotificationController(INotificationService notificationService) : ControllerBase
{
  [HttpGet("{id}")]
  public async Task<Notification> Get([FromRoute] Guid id)
  {
    return await notificationService.Get(id);
  }

  [HttpGet("")]
  public Task<PaginatedResponse<Notification>> List([FromQuery] Pagination pagination)
  {
    return notificationService.List(pagination);
  }

  [HttpPatch("{id}")]
  public Task MarkAsRead([FromRoute] Guid id)
  {
    return notificationService.MarkAsRead(id);
  }
}