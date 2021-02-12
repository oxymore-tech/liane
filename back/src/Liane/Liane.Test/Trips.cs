using System.Collections.Immutable;
using Liane.Api.Trip;

namespace Liane.Test
{
    public sealed class Trips
    {
        public static readonly Trip Mende_Florac = new Trip(ImmutableList.Create(LabeledPositions.Mende, LabeledPositions.LesBondons_Parking, LabeledPositions.Florac));
        public static readonly Trip Blajoux_Florac = new Trip(ImmutableList.Create(LabeledPositions.Blajoux_Parking, LabeledPositions.Florac));
        public static readonly Trip Blajoux_Mende = new Trip(ImmutableList.Create(LabeledPositions.Blajoux_Parking, LabeledPositions.Mende));
        public static readonly ImmutableList<Trip> AllTrips = ImmutableList.Create(
            Mende_Florac,
            Blajoux_Florac,
            Blajoux_Mende
        );
    }
}