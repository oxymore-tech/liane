using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.RallyingPoint;

public interface IRallyingPointService
{
    Task<RallyingPoint> Get(string id);

    Task<RallyingPoint> Create(RallyingPoint rallyingPoint);

    Task Delete(string id);

    Task Update(string id, RallyingPoint rallyingPoint);

    Task ImportCities();

    Task<ImmutableList<RallyingPoint>> List(LatLng? pos, string? search);
    
    Task<RallyingPoint?> Snap(LatLng position);

    Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> pos);
}