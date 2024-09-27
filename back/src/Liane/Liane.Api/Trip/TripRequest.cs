using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public record BaseLianeRequest(
  DateTime DepartureTime,
  DateTime? ReturnTime,
  int AvailableSeats,
  [property: SerializeAsResolvedRef] Ref<RallyingPoint> From,
  [property: SerializeAsResolvedRef] Ref<RallyingPoint> To,
  GeolocationLevel GeolocationLevel
);

public sealed record TripRequest(
  string? Id,
  Ref<Community.Liane> Liane,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  int AvailableSeats,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  GeolocationLevel GeolocationLevel
) : BaseLianeRequest(DepartureTime, ReturnTime, AvailableSeats, From, To, GeolocationLevel), IIdentity<string>;