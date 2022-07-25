using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.RallyingPoints;

public interface IRallyingPointService
{
    Task<RallyingPoint> Create(RallyingPoint rallyingPoint);

    Task Delete(string id);

    Task Update(string id, RallyingPoint rallyingPoint);

    Task ImportCities();

    Task<ImmutableList<RallyingPoint>> List(LatLng? pos, string? search);

    Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> pos);
}