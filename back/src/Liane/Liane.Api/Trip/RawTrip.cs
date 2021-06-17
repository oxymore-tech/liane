using System.Collections.Immutable;
using Liane.Api.Location;

namespace Liane.Api.Trip
{
    public sealed record RawTrip(
        ImmutableList<UserLocation> Locations
    );
}