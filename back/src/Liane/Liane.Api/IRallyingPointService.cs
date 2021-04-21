using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api
{
    public interface IRallyingPointService
    {
        Task<RallyingPoint> Get(string id);
        Task<RallyingPoint?> TrySnap(LatLng position);
        Task<RallyingPoint> Snap(LatLng position);
        Task<ImmutableList<RallyingPoint>> List(LatLng center);
    }
}