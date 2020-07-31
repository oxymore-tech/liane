using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Osrm
{
    public interface IOsrmService
    {
        Task<Response.Routing> Route(ImmutableList<LatLng> coordinates,
            string alternatives = "false",
            string steps = "false",
            string geometries = "geojson",
            string overview = "simplified",
            string annotations = "false",
            string continueStraight = "default");
    }
}