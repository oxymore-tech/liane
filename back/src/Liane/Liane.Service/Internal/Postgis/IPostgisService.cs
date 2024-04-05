using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis.Db;

namespace Liane.Service.Internal.Postgis;

public sealed record BatchGeometryUpdateInput(HashSet<string> Trips, HashSet<(string, string)> Segments);

public sealed record BatchGeometryUpdate(List<SegmentDb> Segments, List<LianeWaypointDb> WayPoints);

public interface ITripSession: IAsyncDisposable
{
  public Task<(double fraction, LatLng nearestPoint, double distance)> LocateOnRoute(LatLng coordinate);
}

public interface IPostgisService
{
  Task UpdateGeometry(Api.Trip.Trip trip);
  Task SyncGeometries(IEnumerable<Api.Trip.Trip> source);
  Task Clear(IEnumerable<Ref<Api.Trip.Trip>> lianes);
  Task<ImmutableList<LianeMatchCandidate>> GetMatchingTrips(Route targetRoute, DateTime from, DateTime to);
  Task<ImmutableList<LianeMatchCandidate>> GetMatchingTrips(LatLng pickup, LatLng deposit, DateTime from, DateTime to);
  Task<ITripSession> CreateOngoingTrip(string id, LineString route);
  Task<ITripSession> CreateOfflineTrip(string id, LineString route);
  Task<ImmutableList<Ref<Api.Trip.Trip>>> ListSearchableTrips();
  Task<ImmutableList<Ref<Api.Trip.Trip>>> ListOngoingTrips();
}