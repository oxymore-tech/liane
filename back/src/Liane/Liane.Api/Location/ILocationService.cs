using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Location
{
    public interface ILocationService
    {
        Task LogLocation(ImmutableList<UserLocation> userLocations);
        Task SaveTrip(ImmutableList<UserLocation> userLocations);        
    }
}