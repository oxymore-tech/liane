using System;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip;

internal sealed record RallyingPointDb(
  string? Id,
  string Label,
  LatLng Location,
  string Type,
  string Address,
  string ZipCode,
  string City,
  int? PlaceCount,
  bool IsActive
) : IIdentity;
