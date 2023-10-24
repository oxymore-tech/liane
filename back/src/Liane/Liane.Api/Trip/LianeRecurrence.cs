using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record LianeRecurrence(string? Id,
  Ref<User.User>? CreatedBy,
  DateTime? CreatedAt,
  DayOfTheWeekFlag Days,
  BaseLianeRequest InitialRequest,
  bool Active = true) : IEntity
{
  public static LianeRecurrence FromLianeRequest(LianeRequest request)
  {
    return new LianeRecurrence(null, null, null, request.Recurrence!.Value, new BaseLianeRequest(request.DepartureTime, request.ReturnTime, request.AvailableSeats, request.From, request.To, request.GeolocationLevel));
  }

  public LianeRequest GetLianeRequest()
  {
    return new LianeRequest(null, InitialRequest.DepartureTime, InitialRequest.ReturnTime, InitialRequest.AvailableSeats, InitialRequest.From, InitialRequest.To, Days);
  }
}