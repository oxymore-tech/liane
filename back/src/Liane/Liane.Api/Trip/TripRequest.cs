using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record TripRequest(
  string? Id,
  Ref<Community.Liane> Liane,
  DateTime ArriveAt,
  DateTime? ReturnAt,
  int AvailableSeats,
  [property: SerializeAsResolvedRef] Ref<RallyingPoint> From,
  [property: SerializeAsResolvedRef] Ref<RallyingPoint> To,
  GeolocationLevel GeolocationLevel
) : IIdentity<string>;