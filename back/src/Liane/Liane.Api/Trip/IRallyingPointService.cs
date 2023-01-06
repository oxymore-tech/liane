using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface IRallyingPointService : ICrudService<RallyingPoint>
{
    Task ImportCities();

    Task<ImmutableList<RallyingPoint>> List(LatLng? pos, string? search);
    
    Task<RallyingPoint?> Snap(LatLng position);

    Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> pos);
}