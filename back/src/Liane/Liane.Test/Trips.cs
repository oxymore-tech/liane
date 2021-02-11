using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Trip;

namespace Liane.Test
{
    public sealed class Trips
    {
        public static readonly Trip Mende_Florac = new Trip(ImmutableList.Create(Positions.Mende, new LatLng(44.386163900323, 3.6188685894012), Positions.Florac));
        public static readonly Trip Blajoux_Florac = new Trip(ImmutableList.Create(Positions.Blajoux_Parking, Positions.Florac));
        public static readonly Trip Blajoux_Mende = new Trip(ImmutableList.Create(Positions.Blajoux_Pelardon, Positions.Mende));

        public static readonly IImmutableSet<Trip> AllTrips = ImmutableHashSet.Create(
            Mende_Florac,
            Blajoux_Florac,
            Blajoux_Mende
        );
    }
}