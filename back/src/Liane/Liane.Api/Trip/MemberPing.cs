using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record MemberPing(Ref<Trip> Trip, long Timestamp, LatLng? Coordinate);