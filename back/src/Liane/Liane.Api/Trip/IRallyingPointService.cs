using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface IRallyingPointService : ICrudService<RallyingPoint>
{
  const int MaxRadius = 50_000;

  Task Generate();

  Task<ImmutableList<RallyingPoint>> List(LatLng? center, int? distance = null, string? search = null, int? limit = null);

  Task Insert(IEnumerable<RallyingPoint> rallyingPoints);

  Task<bool> Update(Ref<RallyingPoint> reference, RallyingPoint inputDto);

  Task<RallyingPoint?> Snap(LatLng position, int radius = 100);

  Task<RallyingPoint?> SnapViaRoute(LatLng position, int radius = 100);
}