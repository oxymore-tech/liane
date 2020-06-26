using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Object;
using Liane.Api.Response;

namespace Liane.Api
{
    public interface IOsrmService
    {
        Task<(Geojson geojson, float duration, float distance)> BasicRouteMethod(ImmutableList<double> startPoint, ImmutableList<double> endPoint);
        
        // TODO customized scenario method
        
    }
}