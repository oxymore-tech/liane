using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Postgis.Db;

namespace Liane.Service.Internal.Postgis;

public sealed record BatchGeometryUpdateInput(HashSet<string> Lianes, HashSet<(string, string)> Segments);

public sealed record BatchGeometryUpdate(List<SegmentDb> Segments, List<LianeWayPointDb> WayPoints);

public interface IPostgisService
{
  Task UpdateGeometry(Api.Trip.Liane liane);
  Task UpdateGeometry(Func<BatchGeometryUpdateInput, Task<BatchGeometryUpdate>> batch);
  Task Clear(ImmutableList<string> lianes);
  Task ClearRallyingPoints();
  Task InsertRallyingPoints(IEnumerable<RallyingPoint> rallyingPoints);
  Task<ImmutableList<LianeMatchCandidate>> GetMatchingLianes(Route targetRoute, DateTime from, DateTime to);
}