using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record JoinTrip(
  Ref<Trip> Trip,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  bool TakeReturnTrip
);