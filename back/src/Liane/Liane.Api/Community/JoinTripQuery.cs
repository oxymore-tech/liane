using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public record JoinTripQuery(
  Ref<Liane> Liane,
  Ref<Trip.Trip> Trip,
  bool TakeReturnTrip
);