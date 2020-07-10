using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Nominatim
{
    public interface INominatimService
    {
        Task<Response> AddressSearch(LatLng addressQueryCoord);
        Task<Response> CoordSearch(string addressQueryName);

    }
}