using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record LianeRecurrence(string Id,
  Ref<User.User>? CreatedBy,
  DateTime? CreatedAt,
  DayOfTheWeekFlag Days,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  int AvailableSeats,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  bool Active = true) : IEntity
{
  public static LianeRecurrence FromLianeRequest(LianeRequest request)
  {
    return new LianeRecurrence(null, null, null, request.Recurrence!.Value, request.DepartureTime, request.ReturnTime, request.AvailableSeats, request.From, request.To);
  }

  public LianeRequest GetLianeRequest()
  {
    return new LianeRequest(null, DepartureTime, ReturnTime, AvailableSeats, From, To, Days);
  }
}