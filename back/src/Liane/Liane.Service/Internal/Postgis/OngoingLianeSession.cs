using System.Data;
using System.Threading.Tasks;
using Dapper;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util.Sql;

namespace Liane.Service.Internal.Postgis;

public sealed partial class PostgisServiceImpl
{
  public async Task<ITripSession> CreateOngoingTrip(string id, LineString route)
  {
    using var connection = db.NewConnection();
    await connection.MergeAsync(new OngoingTripDb(id, route));
    return new OngoingTripSession(id, db);
  }

  public Task<ITripSession> CreateOfflineTrip(string id, LineString route)
  {
    return Task.FromResult((ITripSession)new OfflineTripSession(db, route));
  }

  private sealed class OngoingTripSession : ITripSession
  {
    private readonly string id;
    private readonly PostgisDatabase postgis;

    public OngoingTripSession(string id, PostgisDatabase postgis)
    {
      this.id = id;
      this.postgis = postgis;
    }

    public async Task<(double fraction, LatLng nearestPoint, double distance)> LocateOnRoute(LatLng coordinate)
    {
      using var connection = postgis.NewConnection();
      var result = await connection.QuerySingleAsync<(double fraction, LatLng nearestPoint, double distance)>(
        "select fraction, ST_LineInterpolatePoint(geometry, fraction) as nearest_point, ST_DistanceSphere(@point::geometry(Point, 4326), geometry) as distance from (select ST_LineLocatePoint(geometry, @point::geometry(Point, 4326)) as fraction, geometry from ongoing_trip where id = @id) as trip",
        new { id, point = coordinate }
      );
      return result;
    }

    public async ValueTask DisposeAsync()
    {
      using var connection = postgis.NewConnection();
      await connection.ExecuteAsync("DELETE FROM ongoing_trip WHERE id = @id", new { id });
    }
  }

  private sealed class OfflineTripSession : ITripSession
  {
    private readonly IDbConnection connection;
    private readonly LineString route;

    public OfflineTripSession(PostgisDatabase postgis, LineString route)
    {
      this.route = route;
      this.connection = postgis.NewConnection();
    }

    public async Task<(double fraction, LatLng nearestPoint, double distance)> LocateOnRoute(LatLng coordinate)
    {
      var result = await connection.QuerySingleAsync<(double fraction, LatLng nearestPoint, double distance)>(
        "select fraction, ST_LineInterpolatePoint(geometry, fraction) as nearest_point, ST_DistanceSphere(@point::geometry(Point, 4326), geometry) as distance from (select ST_LineLocatePoint(@route::geometry(LineString, 4326), @point::geometry(Point, 4326)) as fraction, @route::geometry(LineString, 4326) as geometry) as trip",
        new { route, point = coordinate }
      );
      return result;
    }

    public ValueTask DisposeAsync()
    {
      connection.Dispose();
      return ValueTask.CompletedTask;
    }
  }
}