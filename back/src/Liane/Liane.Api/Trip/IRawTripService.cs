using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Trip
{
    public interface IRawTripService
    {
        /**
         * Save trips for the current user.
         */
        Task Save(ImmutableList<RawTrip> trips);
        
        /**
         * List trips for the current user.
         */
        Task<ImmutableList<RawTrip>> List();
        
        /**
         * List trips for a given user.
         */
        Task<ImmutableList<RawTrip>> ListFor(string userId);
        
        /**
         * List all trips.
         */
        Task<ImmutableList<RawTrip>> ListAll();
        
        /**
         * Get the trips regarding a filter.
         */
        Task<ImmutableList<RawTrip>> Snap(RawTripFilter rawTripFilter);

        /**
         * Get raw trips statistics.
         */
        Task<RawTripStats> Stats();

    }
}