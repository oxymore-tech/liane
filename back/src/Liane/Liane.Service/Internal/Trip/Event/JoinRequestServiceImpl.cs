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

  public async Task<bool> TryAcceptRequest(TripEvent.JoinRequest joinRequest, Ref<Api.Auth.User> newMember)
  {
    var liane = await tripService.Get(joinRequest.Trip);
    var creator = await userService.GetFullUser(liane.CreatedBy);
    return creator.LastName.Equals("$");
  }
}

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class JoinRequestServiceImpl(
  INotificationService notificationService,
  IRallyingPointService rallyingPointService,
  ITripService tripService,
  IUserService userService,
  ICurrentContext currentContext,
  EventDispatcher eventDispatcher,
  ILogger<JoinRequestServiceImpl> logger,
  IAutomaticAnswerService automaticAnswerService,
  IMongoDatabase mongoDatabase,
  IUserStatService userStatService)
  : IJoinRequestService
{
  public async Task OnEvent(TripEvent.JoinRequest e, Ref<Api.Auth.User>? sender = null)
  {
    var liane = await tripService.Get(e.Trip);
    var role = e.Seats > 0 ? "conducteur" : "passager";
    var member = sender ?? currentContext.CurrentUser().Id;
    if (await automaticAnswerService.TryAcceptRequest(e, member))
    {
      // Creator is a bot or automatically accepts requests
      var notification = await AcceptMember(liane, member, e);
      await eventDispatcher.Dispatch(notification, liane.CreatedBy);
      return;
    }

    await notificationService.SendEvent("Nouvelle demande", $"Un nouveau {role} voudrait rejoindre votre Liane.", member, liane.Driver.User, e, Answer.Accept, Answer.Reject);
  }

  private async Task<TripEvent.MemberAccepted> AcceptMember(Ref<Api.Trip.Trip> lianeRef, Ref<Api.Auth.User> memberRef, TripEvent.JoinRequest joinRequest)
  {
    var member = new TripMember(memberRef, joinRequest.From, joinRequest.To, joinRequest.Seats, GeolocationLevel: joinRequest.GeolocationLevel);
    var liane = await tripService.AddMember(lianeRef, member);
    await userStatService.IncrementTotalJoinedTrips(memberRef);
    if (joinRequest.TakeReturnTrip)
    {
      await tripService.AddMember(liane.Return!, member with { From = joinRequest.To, To = joinRequest.From });
      await userStatService.IncrementTotalJoinedTrips(memberRef);
    }

    return new TripEvent.MemberAccepted(joinRequest.Trip, memberRef, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip);
  }

  public async Task OnAnswer(Notification.Event e, TripEvent.JoinRequest joinRequest, Answer answer, Ref<Api.Auth.User>? sender = null)
  {
    var liane = await tripService.Get(joinRequest.Trip);
    if (liane.State is not (TripState.Started or TripState.NotStarted))
    {
      throw new ValidationException(ValidationMessage.LianeStateInvalid(liane.State));
    }

    TripEvent tripEvent = answer switch
    {
      Answer.Accept => await AcceptMember(liane, e.CreatedBy!, joinRequest),
      Answer.Reject => new TripEvent.MemberRejected(joinRequest.Trip, e.CreatedBy!, joinRequest.From, joinRequest.To, joinRequest.Seats, joinRequest.TakeReturnTrip),
      _ => throw new ArgumentOutOfRangeException(nameof(answer), answer, null)
    };
    await eventDispatcher.Dispatch(tripEvent, sender);
  }

  public async Task<PaginatedResponse<JoinTripRequest>> List(Pagination pagination)
  {
    var paginated = await notificationService.List(new NotificationFilter(null, currentContext.CurrentUser().Id, null, new PayloadType.Event<TripEvent.JoinRequest>()), pagination);
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
    return resolved.Where(r => r is not null).Select<JoinTripRequest>(r => r!);
  }

  public async Task<JoinTripRequest> Get(Ref<Notification> id)
  {
    return await Resolve(await notificationService.Get(id));
  }

  public async Task RejectJoinRequests(IEnumerable<Ref<Api.Trip.Trip>> trips)
  {
    var filter =
      Builders<Notification.Event>.Filter.IsInstanceOf<Notification.Event, TripEvent.JoinRequest>(n => n.Payload)
      & Builders<Notification.Event>.Filter.Where(n => trips.Contains(n.Payload.Trip));
    var result = await mongoDatabase.GetCollection<Notification.Event>()
      .Find(filter).ToListAsync();
    await Parallel.ForEachAsync(result, async (req, _) => { await eventDispatcher.DispatchAnswer(req, Answer.Reject, req.Recipients[0].User); });
  }

  public async Task Delete(Ref<Notification> id)
  {
    await notificationService.Delete(id);
  }

  private async Task<JoinTripRequest> Resolve(Notification notification)
  {
    if (notification is not Notification.Event lianeEvent)
    {
      throw new ArgumentException("Notification is not a LianeEvent");
    }

    if (lianeEvent.Payload is not TripEvent.JoinRequest joinRequest)
    {
      throw new ArgumentException("Notification payload is not a JoinRequest");
    }

    var from = await rallyingPointService.Get(joinRequest.From);
    var to = await rallyingPointService.Get(joinRequest.To);
    var liane = await tripService.Get(joinRequest.Trip);
    var createdBy = await userService.Get(lianeEvent.CreatedBy!);

    if (liane.State != TripState.NotStarted)
    {
      throw new ConstraintException("This request is linked to a liane with state " + liane.State);
    }

    var match = await tripService.GetNewTrip(liane, from, to, joinRequest.Seats > 0);
    if (match is null)
    {
      throw new ConstraintException("This request is no longer compatible with target Liane");
    }

    return new JoinTripRequest(lianeEvent.Id!, from, to, liane, createdBy, lianeEvent.CreatedAt, joinRequest.Seats, joinRequest.TakeReturnTrip, joinRequest.Message, false, match);
  }
}