using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/notifications")]
    [ApiController]
    public sealed class NotificationController : ControllerBase
    {
        private readonly INotificationService notificationService;

        public NotificationController(INotificationService notificationService)
        {
            this.notificationService = notificationService;
        }

        [HttpGet("get")]
        public async Task<ImmutableList<Notification>> getNotifications([FromQuery] string user)
        {
            return await notificationService.getNotifications(user);
        }

        [HttpPost("delete")]
        public async Task deleteNotification([FromQuery] string user, [FromQuery] int date) {
            await notificationService.deleteNotification(user, date);
        }
    }
}