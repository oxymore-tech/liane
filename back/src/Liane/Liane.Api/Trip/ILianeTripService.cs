using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Trip
{
    public interface ILianeTripService
    {
        /**
         * Save a list of liane.
         */
        Task Create(ImmutableHashSet<(ImmutableHashSet<RallyingPoint> rallyingPoints, long timestamp)> rallyingPointsTrips);
        
        /**
         * Delete a liane trip and its corresponding liane.
         */
        Task Delete(string lianeTripId);
        
        /**
         * Get the current user lianes.
         */
        Task<ImmutableHashSet<Liane>> Get();
        
        /**
         * Select the trips to show.
         */
        Task<ImmutableHashSet<RoutedLiane>> Snap(TripFilter tripFilter);

        /**
         * Flush the old data and re-generate every liane trip from raw ones.
         */
        Task Generate();
    }
}