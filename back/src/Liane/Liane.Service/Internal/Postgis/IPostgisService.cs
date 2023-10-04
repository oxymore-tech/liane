using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis.Db;

namespace Liane.Service.Internal.Postgis;

public sealed record BatchGeometryUpdateInput(HashSet<string> Lianes, HashSet<(string, string)> Segments);

public sealed record BatchGeometryUpdate(List<SegmentDb> Segments, List<LianeWaypointDb> WayPoints);

public interface IOngoingTripSession
{
  public Task<(double fraction, LatLng nearestPoint)> LocateOnRoute(LatLng coordinate);
  public Task Dispose();
}

public interface IPostgisService
{
  Task UpdateGeometry(Api.Trip.Liane liane);
  Task SyncGeometries(IEnumerable<Api.Trip.Liane> source);
  Task Clear(IEnumerable<Ref<Api.Trip.Liane>> lianes);
  Task<ImmutableList<LianeMatchCandidate>> GetMatchingLianes(Route targetRoute, DateTime from, DateTime to);
  Task<ImmutableList<LianeMatchCandidate>> GetMatchingLianes(LatLng pickup, LatLng deposit, DateTime from, DateTime to);
  Task<IOngoingTripSession> CreateOngoingTrip(string id, LineString route);
  Task<ImmutableList<Ref<Api.Trip.Liane>>> ListSearchableLianes();
  Task<ImmutableList<Ref<Api.Trip.Liane>>> ListOngoingLianes();
}