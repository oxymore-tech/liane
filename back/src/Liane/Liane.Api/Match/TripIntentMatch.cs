using System.Collections.Immutable;
using Liane.Api.RallyingPoints;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Match;

public sealed record TripIntentMatch(
    TripIntent TripIntent,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    ImmutableList<Match> Matches
);

public sealed record Match(Ref<User.User> User, Ref<RallyingPoint> From, Ref<RallyingPoint> To);