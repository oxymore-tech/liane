using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Location;
using Liane.Api.Rp;

namespace Liane.Api.Trip
{
    public interface ILianeTripService
    {
        /**
         * Save a list of liane.
         */
        Task Create(string user, ImmutableList<UserLocation> locations);
        
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
        
        /**
         * Get liane trips statistics.
         */
        Task<LianeStats> Stats();
    }
}