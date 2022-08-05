using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/notification")]
[ApiController]
[RequiresAuth]
public sealed class NotificationController : ControllerBase
{
    private readonly INotificationService notificationService;

    public NotificationController(INotificationService notificationService)
    {
        this.notificationService = notificationService;
    }

    [HttpPost("notify")]
    public async Task NotifyDriver([FromQuery] string user, [FromQuery] string name, [FromQuery] string number)
    {
        await notificationService.NotifyDriver(user, name, number);
    }

    [HttpGet("")]
    public async Task<ImmutableList<Notification>> GetNotifications()
    {
        return await notificationService.List();
    }

    [HttpPost("delete")]
    public async Task DeleteNotification([FromQuery] int date)
    {
        await notificationService.DeleteNotification(date);
    }
}