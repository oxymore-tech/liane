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
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Trip.Event;

public sealed class AutomaticAnswerService
{
  private readonly EventDispatcher eventDispatcher;
  private readonly ILianeService lianeService;
  private readonly IUserService userService;

  public AutomaticAnswerService(EventDispatcher eventDispatcher, ILianeService lianeService, IUserService userService)
  {
    this.eventDispatcher = eventDispatcher;
    this.lianeService = lianeService;
    this.userService = userService;
  }

  public async Task<bool> TryAcceptRequest(LianeEvent.JoinRequest joinRequest, Ref<Api.User.User> newMember)
  {
    
    var liane = await lianeService.Get(joinRequest.Liane);
    var creator = await userService.GetFullUser(liane.CreatedBy);
    if (!creator.LastName.Equals("$")) return false;  

    await eventDispatcher.Dispatch(new LianeEvent.MemberAccepted(liane, newMember, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip), creator);
    return true;
  }
}
public sealed class LianeRequestServiceImpl : ILianeRequestService
{
  private readonly INotificationService notificationService;
  private readonly EventDispatcher eventDispatcher;
  private readonly IRallyingPointService rallyingPointService;
  private readonly ILianeService lianeService;
  private readonly IUserService userService;
  private readonly ICurrentContext currentContext;
  private readonly ILogger<LianeRequestServiceImpl> logger;
  private readonly IAutomaticAnswerService automaticAnswerService;

  public LianeRequestServiceImpl(INotificationService notificationService, IRallyingPointService rallyingPointService, ILianeService lianeService, IUserService userService,
    ICurrentContext currentContext, EventDispatcher eventDispatcher, ILogger<LianeRequestServiceImpl> logger, IAutomaticAnswerService automaticAnswerService)
  {
    this.notificationService = notificationService;
    this.rallyingPointService = rallyingPointService;
    this.lianeService = lianeService;
    this.userService = userService;
    this.currentContext = currentContext;
    this.eventDispatcher = eventDispatcher;
    this.logger = logger;
    this.automaticAnswerService = automaticAnswerService;
  }

  public async Task OnEvent(LianeEvent.JoinRequest joinRequest, Ref<Api.User.User>? sender = null)
  {
    var liane = await lianeService.Get(joinRequest.Liane);
    var role = joinRequest.Seats > 0 ? "conducteur" : "passager";
    var member = sender ?? currentContext.CurrentUser().Id;
    if (await automaticAnswerService.TryAcceptRequest(joinRequest, member))
    {
      // Creator is a bot or automatically accepts requests
      return;
    }
    else
    {
      await notificationService.SendEvent("Nouvelle demande", $"Un nouveau {role} voudrait rejoindre votre Liane.", member, liane.Driver.User, joinRequest, Answer.Accept, Answer.Reject);
    }
  }

  public async Task OnAnswer(Notification.Event e, LianeEvent.JoinRequest joinRequest, Answer answer, Ref<Api.User.User>? sender = null)
  {
    LianeEvent lianeEvent = answer switch
    {
      Answer.Accept => new LianeEvent.MemberAccepted(joinRequest.Liane, e.CreatedBy!, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip),
      Answer.Reject => new LianeEvent.MemberRejected(joinRequest.Liane, e.CreatedBy!, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip),
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
        logger.LogWarning("Error on JoinLianeRequest {id} : {message}", j.Id, e.Message);
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
    var createdBy = await userService.Get(lianeEvent.CreatedBy!);
    
    if (liane.State != LianeState.NotStarted)
    {
      throw new ConstraintException("This request is linked to a liane with state "+ liane.State);
    }

    var match = await lianeService.GetNewTrip(liane, from, to, joinRequest.Seats > 0);
    if (match is null)
    {
      throw new ConstraintException("This request is no longer compatible with target Liane");
    }

    return new JoinLianeRequest(lianeEvent.Id!, from, to, liane, createdBy, lianeEvent.CreatedAt, joinRequest.Seats, joinRequest.TakeReturnTrip, joinRequest.Message, false, match);
  }
}