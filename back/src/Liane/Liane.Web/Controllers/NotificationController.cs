using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/notification")]
[ApiController]
[RequiresAuth]
public sealed class NotificationController : ControllerBase
{
  private readonly INotificationService notificationService;
  private readonly ICurrentContext currentContext;

  public NotificationController(INotificationService notificationService, ICurrentContext currentContext)
  {
    this.notificationService = notificationService;
    this.currentContext = currentContext;
  }

  [HttpGet("{id}")]
  public async Task<Notification> Get([FromRoute] string id)
  {
    return await notificationService.Get(id);
  }

  [HttpGet("")]
  public Task<PaginatedResponse<Notification>> List([FromRoute] PayloadType? type, [FromQuery] Pagination pagination)
  {
    return notificationService.List(new NotificationFilter(currentContext.CurrentUser().Id, null, null, type), pagination);
  }

  [HttpPost("{id}")]
  public Task Answer([FromRoute] string id, [FromBody] Answer answer)
  {
    return notificationService.Answer(id, answer);
  }

  [HttpPatch("{id}")]
  public Task MarkAsRead([FromRoute] string id)
  {
    return notificationService.MarkAsRead(id);
  }
}