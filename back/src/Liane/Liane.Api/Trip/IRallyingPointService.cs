using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface IRallyingPointService : ICrudService<RallyingPoint>
{
  const int MaxRadius = 50_000;

  Task<PaginatedResponse<RallyingPoint>> List(RallyingPointFilter rallyingPointFilter);

  Task Insert(IEnumerable<RallyingPoint> rallyingPoints, bool clearAll = false);

  Task<bool> Update(Ref<RallyingPoint> reference, RallyingPoint inputDto);

  Task<RallyingPoint?> Snap(LatLng position, int radius = 100);

  Task<RallyingPoint?> SnapViaRoute(LatLng position, int radius = 100);

  Task<IDatabaseExportContext> ExportCsv(RallyingPointFilter rallyingPointFilter);
  Task<IDatabaseImportContext> ImportCsv();
  Task SetActive(IEnumerable<Ref<RallyingPoint>> points, bool active);
  Task<int> DeleteMany(IEnumerable<Ref<RallyingPoint>> points);
  Task<int> DeleteMany(RallyingPointFilter rallyingPointFilter);
}