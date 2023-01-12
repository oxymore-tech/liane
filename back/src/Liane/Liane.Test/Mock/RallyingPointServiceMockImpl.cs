using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;

namespace Liane.Test.Mock;

public class RallyingPointServiceMockImpl : CrudServiceMockImpl<RallyingPoint>, IRallyingPointService
{


    public Task ImportCities()
    {
        throw new System.NotImplementedException();
    }

    public Task<ImmutableList<RallyingPoint>> List(LatLng? pos, string? search)
    {
        throw new System.NotImplementedException();
    }

    public Task<RallyingPoint?> Snap(LatLng position)
    {
        throw new System.NotImplementedException();
    }

    public Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> pos)
    {
        throw new System.NotImplementedException();
    }

    public override Task<RallyingPoint> Create(RallyingPoint obj)
    {
        throw new System.NotImplementedException();
    }
}