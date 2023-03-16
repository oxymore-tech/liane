using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.User;
using Liane.Api.Util.Pagination;

namespace Liane.Service.Internal.Event;

public sealed class NotificationServiceImpl : INotificationService
{
  private readonly IEventService eventService;
  private readonly IUserService userService;

  public NotificationServiceImpl(IUserService userService, IEventService eventService)
  {
    this.userService = userService;
    this.eventService = eventService;
  }

  public async Task<PaginatedResponse<Notification>> List(Pagination pagination)
  {
    var events = await eventService.List(pagination);
    return await events.SelectAsync(Get);
  }

  public async Task<Notification> Get(Api.Event.Event e)
  {
    var (title, message) = WriteNotificationFr(e);
    var createdBy = await e.CreatedBy.Resolve(userService.Get);

    var userEvent = new UserEvent(e.Id!, createdBy, e.CreatedAt!.Value, e.NeedsAnswer, e.Liane, e.LianeEvent);
    return new Notification(title, message, userEvent);
  }

  private static (string title, string message) WriteNotificationFr(Api.Event.Event payload)
  {
    return payload.LianeEvent switch
    {
      LianeEvent.JoinRequest join => WriteNotificationFr(join),
      LianeEvent.NewMember => ("Demande acceptée", "Vous avez rejoint une nouvelle Liane !"),
      LianeEvent.MemberRejected => ("Demande acceptée", "Vous avez rejoint une nouvelle Liane !"),
      _ => ("Notification", "NA")
    };
  }

  private static (string title, string message) WriteNotificationFr(LianeEvent.JoinRequest join)
  {
    var role = join.Seats > 0 ? "conducteur" : "passager";
    return ("Nouvelle demande", $"Un nouveau {role} voudrait rejoindre votre Liane.");
  }
}