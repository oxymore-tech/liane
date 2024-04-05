using System;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record TripRecurrence(
  string? Id,
  Ref<User>? CreatedBy,
  DateTime? CreatedAt,
  DayOfWeekFlag Days,
  BaseTripRequest InitialRequest,
  bool Active = true) : IEntity<string>
{
  public static TripRecurrence FromLianeRequest(TripRequest request)
  {
    return new TripRecurrence(null, null, null, request.Recurrence!.Value,
      new BaseTripRequest(request.DepartureTime, request.ReturnTime, request.AvailableSeats, request.From, request.To, request.GeolocationLevel));
  }

  public TripRequest GetTripRequest()
  {
    return new TripRequest(InitialRequest.DepartureTime, InitialRequest.ReturnTime, InitialRequest.AvailableSeats, InitialRequest.From, InitialRequest.To, Days);
  }
}