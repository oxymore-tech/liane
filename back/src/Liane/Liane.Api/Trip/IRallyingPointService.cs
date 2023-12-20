using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Routing;
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

  Task ExportCsv(Stream output, RallyingPointFilter rallyingPointFilter);
  Task ImportCsv(Stream input);

  Task SetActive(IEnumerable<Ref<RallyingPoint>> points, bool active);
  Task<int> DeleteMany(IEnumerable<Ref<RallyingPoint>> points);
  Task<int> DeleteMany(RallyingPointFilter rallyingPointFilter);
  Task UpdateStats(Ref<RallyingPoint> point, DateTime lastUsage, int incUsageCount = 1);
  Task UpdateStats(IEnumerable<Ref<RallyingPoint>> point, DateTime lastUsage, int incUsageCount = 1);
  Task<RallyingPointStats> GetStats(Ref<RallyingPoint> point);
  Task<FeatureCollection> GetDepartment(string n);
}