using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Trip
{
    public sealed class TripServiceImpl : ITripService
    {
        private static readonly ImmutableList<string> Mende_Florac = ImmutableList.Create("Mende", "LesBondons_Parking", "Florac");
        private static readonly ImmutableList<string> Blajoux_Florac = ImmutableList.Create("Blajoux_Parking", "Florac");
        private static readonly ImmutableList<string> Blajoux_Mende = ImmutableList.Create("Blajoux_Parking", "Mende");
        private static readonly ImmutableList<ImmutableList<string>> AllTrips = ImmutableList.Create(
            Mende_Florac,
            Blajoux_Florac,
            Blajoux_Mende
        );

        public Task<RallyingPoint?> GetRallyingPoint(string id)
        {
            throw new System.NotImplementedException();
        }

        public Task<ImmutableHashSet<Api.Trip.Trip>> List()
        {
            throw new System.NotImplementedException();
        }
    }
}