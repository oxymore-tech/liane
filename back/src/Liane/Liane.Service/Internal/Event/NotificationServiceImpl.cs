using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Event;

public sealed class NotificationServiceImpl : INotificationService
{
  private readonly ICurrentContext currentContext;
  private readonly IEventService eventService;
  private readonly IUserService userService;

  public NotificationServiceImpl(IUserService userService, IEventService eventService, ICurrentContext currentContext)
  {
    this.userService = userService;
    this.eventService = eventService;
    this.currentContext = currentContext;
  }

  public async Task<PaginatedResponse<Notification>> List(Pagination pagination)
  {
    var events = await eventService.List(new EventFilter(true, null, null), pagination);
    return await events.SelectAsync(Get);
  }

  public async Task<Notification> Get(Api.Event.Event e)
  {
    var currentUser = currentContext.CurrentUser();
    var (title, message) = WriteNotificationFr(e);
    var createdBy = await e.CreatedBy.Resolve(userService.Get);

    var currentRecipient = e.Recipients.FirstOrDefault(r => r.User == currentUser.Id);
    var seen = currentRecipient?.SeenAt != null;

    var userEvent = new UserEvent(e.Id!, createdBy, e.CreatedAt!.Value, seen, e.NeedsAnswer, e.LianeEvent);
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