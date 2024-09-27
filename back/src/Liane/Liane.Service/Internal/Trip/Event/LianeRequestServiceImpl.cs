using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Auth;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Event;

public sealed class AutomaticAnswerService : IAutomaticAnswerService
{
  private readonly ITripService tripService;
  private readonly IUserService userService;

  public AutomaticAnswerService(ITripService tripService, IUserService userService)
  {
    this.tripService = tripService;
    this.userService = userService;
  }

  public async Task<bool> TryAcceptRequest(LianeEvent.JoinRequest joinRequest, Ref<Api.Auth.User> newMember)
  {
    var liane = await tripService.Get(joinRequest.Liane);
    var creator = await userService.GetFullUser(liane.CreatedBy);
    return creator.LastName.Equals("$");
  }
}

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeRequestServiceImpl(
  INotificationService notificationService,
  IRallyingPointService rallyingPointService,
  ITripService tripService,
  IUserService userService,
  ICurrentContext currentContext,
  EventDispatcher eventDispatcher,
  ILogger<LianeRequestServiceImpl> logger,
  IAutomaticAnswerService automaticAnswerService,
  IMongoDatabase mongoDatabase,
  IUserStatService userStatService)
  : ILianeRequestService
{
  public async Task OnEvent(LianeEvent.JoinRequest joinRequest, Ref<Api.Auth.User>? sender = null)
  {
    var liane = await tripService.Get(joinRequest.Liane);
    var role = joinRequest.Seats > 0 ? "conducteur" : "passager";
    var member = sender ?? currentContext.CurrentUser().Id;
    if (await automaticAnswerService.TryAcceptRequest(joinRequest, member))
    {
      // Creator is a bot or automatically accepts requests
      var notification = await AcceptMember(liane, member, joinRequest);
      await eventDispatcher.Dispatch(notification, liane.CreatedBy);
      return;
    }

    await notificationService.SendEvent("Nouvelle demande", $"Un nouveau {role} voudrait rejoindre votre Liane.", member, liane.Driver.User, joinRequest, Answer.Accept, Answer.Reject);
  }

  private async Task<LianeEvent.MemberAccepted> AcceptMember(Ref<Api.Trip.Trip> lianeRef, Ref<Api.Auth.User> memberRef, LianeEvent.JoinRequest joinRequest)
  {
    var member = new TripMember(memberRef, joinRequest.From, joinRequest.To, joinRequest.Seats, GeolocationLevel: joinRequest.GeolocationLevel);
    var liane = await tripService.AddMember(lianeRef, member);
    await userStatService.IncrementTotalJoinedTrips(memberRef);
    if (joinRequest.TakeReturnTrip)
    {
      await tripService.AddMember(liane.Return!, member with { From = joinRequest.To, To = joinRequest.From });
      await userStatService.IncrementTotalJoinedTrips(memberRef);
    }

    return new LianeEvent.MemberAccepted(joinRequest.Liane, memberRef, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip);
  }

  public async Task OnAnswer(Notification.Event e, LianeEvent.JoinRequest joinRequest, Answer answer, Ref<Api.Auth.User>? sender = null)
  {
    var liane = await tripService.Get(joinRequest.Liane);
    if (liane.State is not (TripStatus.Started or TripStatus.NotStarted))
    {
      throw new ValidationException(ValidationMessage.LianeStateInvalid(liane.State));
    }

    LianeEvent lianeEvent = answer switch
    {
      Answer.Accept => await AcceptMember(liane, e.CreatedBy!, joinRequest),
      Answer.Reject => new LianeEvent.MemberRejected(joinRequest.Liane, e.CreatedBy!, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip),
      _ => throw new ArgumentOutOfRangeException(nameof(answer), answer, null)
    };
    await eventDispatcher.Dispatch(lianeEvent, sender);
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

  public async Task RejectJoinLianeRequests(IEnumerable<Ref<Api.Trip.Trip>> lianes)
  {
    var filter =
      Builders<Notification.Event>.Filter.IsInstanceOf<Notification.Event, LianeEvent.JoinRequest>(n => n.Payload)
      & Builders<Notification.Event>.Filter.Where(n => lianes.Contains(n.Payload.Liane));
    var result = await mongoDatabase.GetCollection<Notification.Event>()
      .Find(filter).ToListAsync();
    await Parallel.ForEachAsync(result, async (req, _) => { await eventDispatcher.DispatchAnswer(req, Answer.Reject, req.Recipients[0].User); });
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
    var liane = await tripService.Get(joinRequest.Liane);
    var createdBy = await userService.Get(lianeEvent.CreatedBy!);

    if (liane.State != TripStatus.NotStarted)
    {
      throw new ConstraintException($"This request is linked to a liane {liane.Id} with state {liane.State}");
    }

    var match = await tripService.GetNewTrip(liane, from, to, joinRequest.Seats > 0);
    if (match is null)
    {
      throw new ConstraintException("This request is no longer compatible with target Liane");
    }

    return new JoinLianeRequest(lianeEvent.Id!, from, to, liane, createdBy, lianeEvent.CreatedAt, joinRequest.Seats, joinRequest.TakeReturnTrip, joinRequest.Message, false, match);
  }
}