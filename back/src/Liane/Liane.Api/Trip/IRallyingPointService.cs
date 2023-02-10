using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface IRallyingPointService : ICrudService<RallyingPoint>
{
  
   const int MaxRadius = 400_000;
   const int MaxRallyingPoint = 10;
  Task Generate();

  Task<ImmutableList<RallyingPoint>> List(LatLng? pos, string? search, int? radius = MaxRadius, int? limit = MaxRallyingPoint);

  Task<bool> Update(Ref<RallyingPoint> reference, RallyingPoint inputDto);

  Task<RallyingPoint?> Snap(LatLng position);

  Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> pos);
}