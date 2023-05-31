using System;
using System.Data;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeRequestServiceImpl : ILianeRequestService
{
  private readonly INotificationService notificationService;
  private readonly EventDispatcher eventDispatcher;
  private readonly IRallyingPointService rallyingPointService;
  private readonly ILianeService lianeService;
  private readonly IUserService userService;
  private readonly ICurrentContext currentContext;

  public LianeRequestServiceImpl(INotificationService notificationService, IRallyingPointService rallyingPointService, ILianeService lianeService, IUserService userService,
    ICurrentContext currentContext, EventDispatcher eventDispatcher)
  {
    this.notificationService = notificationService;
    this.rallyingPointService = rallyingPointService;
    this.lianeService = lianeService;
    this.userService = userService;
    this.currentContext = currentContext;
    this.eventDispatcher = eventDispatcher;
  }

  public async Task OnEvent(LianeEvent.JoinRequest joinRequest)
  {
    var liane = await lianeService.Get(joinRequest.Liane);
    var role = joinRequest.Seats > 0 ? "conducteur" : "passager";
    await notificationService.SendEvent("Nouvelle demande", $"Un nouveau {role} voudrait rejoindre votre Liane.", liane.Driver.User, joinRequest, Answer.Accept, Answer.Reject);
  }

  public async Task OnAnswer(Notification.Event e, LianeEvent.JoinRequest joinRequest, Answer answer)
  {
    LianeEvent lianeEvent = answer switch
    {
      Answer.Accept => new LianeEvent.MemberAccepted(joinRequest.Liane, e.Sender!, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip),
      Answer.Reject => new LianeEvent.MemberRejected(joinRequest.Liane, e.Sender!, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip),
      _ => throw new ArgumentOutOfRangeException(nameof(answer), answer, null)
    };
    await eventDispatcher.Dispatch(lianeEvent);
  }

  public async Task<PaginatedResponse<JoinLianeRequest>> List(Pagination pagination)
  {
    var paginated = await notificationService.List(new NotificationFilter(null, currentContext.CurrentUser().Id, null, new PayloadType.Event<LianeEvent.JoinRequest>()), pagination);
    var resolved = await paginated.SelectAsync(async j =>
    {
      // For now we don't want to throw if one request has an error
      try
      {
        return await Resolve(j);
      }
      catch (Exception e)
      {
        return null;
      }
    });
    return resolved.Where(r => r is not null).Select<JoinLianeRequest>(r => r!);
  }

  public async Task<JoinLianeRequest> Get(Ref<Notification> id)
  {
    return await Resolve(await notificationService.Get(id));
  }

  public async Task Delete(Ref<Notification> id)
  {
    await notificationService.Delete(id);
  }

  private async Task<JoinLianeRequest> Resolve(Notification notification)
  {
    if (notification is not Notification.Event lianeEvent)
    {
      throw new ArgumentException("Notification is not a LianeEvent");
    }

    if (lianeEvent.Payload is not LianeEvent.JoinRequest joinRequest)
    {
      throw new ArgumentException("Notification payload is not a JoinRequest");
    }

    var from = await rallyingPointService.Get(joinRequest.From);
    var to = await rallyingPointService.Get(joinRequest.To);
    var liane = await lianeService.Get(joinRequest.Liane);
    var createdBy = await userService.Get(lianeEvent.Sender!);
    
    if (liane.State != LianeState.NotStarted)
    {
      throw new ConstraintException("This request is linked to a liane with state "+ liane.State);
    }

    var match = await lianeService.GetNewTrip(liane, from, to, joinRequest.Seats > 0);
    if (match is null)
    {
      throw new ConstraintException("This request is no longer compatible with target Liane");
    }

    return new JoinLianeRequest(lianeEvent.Id!, from, to, liane, createdBy, lianeEvent.SentAt, joinRequest.Seats, joinRequest.TakeReturnTrip, joinRequest.Message, false, match);
  }
}