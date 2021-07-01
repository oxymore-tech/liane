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
        Task Create(ImmutableHashSet<ImmutableHashSet<RallyingPoint>> rallyingPoints);
        
        /**
         * Delete a liane trip and its corresponding liane.
         */
        Task Delete(string lianeTripId);
        
        /**
         * Select the trips to show.
         */
        Task<List<Liane>> Snap(LatLng center, TripFilter tripFilter);
    }
}