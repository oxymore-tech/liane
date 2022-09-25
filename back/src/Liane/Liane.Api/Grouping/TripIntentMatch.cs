using System.Collections.Immutable;
using Liane.Api.RallyingPoints;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Grouping;

public sealed record TripIntentMatch(
    TripIntent TripIntent,
    RallyingPoint From,
    RallyingPoint To,
    ImmutableList<Match> Matches
);

public sealed record Match(Ref<User.User> User, RallyingPoint From, RallyingPoint To);