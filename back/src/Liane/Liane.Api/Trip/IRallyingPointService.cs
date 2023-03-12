using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface IRallyingPointService : ICrudService<RallyingPoint>
{
  const int MaxRadius = 50_000;
  const int MaxRallyingPoint = 10;

  Task Generate();

  Task<ImmutableList<RallyingPoint>> List(LatLng? from, LatLng? to, int? distance = null, string? search = null, int? limit = null);

  Task<bool> Update(Ref<RallyingPoint> reference, RallyingPoint inputDto);

  Task<RallyingPoint?> Snap(LatLng position, int radius = 100);

  Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> pos);
}