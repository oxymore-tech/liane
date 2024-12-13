using Liane.Api.Community;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record IncomingTrip(
  Ref<LianeRequest> LianeRequest,
  string Name,
  bool Booked,
  Trip Trip
);