using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/notifications")]
    [ApiController]
    [RequiresAuth]
    public sealed class NotificationController : ControllerBase
    {
        private readonly INotificationService notificationService;

        public NotificationController(INotificationService notificationService)
        {
            this.notificationService = notificationService;
        }

        [HttpGet("get")]
        public async Task<ImmutableList<Notification>> getNotifications()
        {
            return await notificationService.getNotifications();
        }

        [HttpPost("delete")]
        public async Task deleteNotification([FromQuery] int date) {
            await notificationService.deleteNotification(date);
        }
    }
}