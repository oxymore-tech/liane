using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeMatch(
  LianeRequest LianeRequest,
  Liane? Liane,
  ImmutableList<Match> Matches
);

public sealed record Match(
  Ref<LianeRequest> LianeRequest,
  [property: SerializeAsResolvedRef] Ref<User.User> User,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  Ref<RallyingPoint>? Pickup,
  Ref<RallyingPoint>? Deposit,
  float Score
);