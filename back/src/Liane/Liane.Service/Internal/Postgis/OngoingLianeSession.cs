using System.Threading.Tasks;
using Dapper;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util.Sql;

namespace Liane.Service.Internal.Postgis;

public sealed partial class PostgisServiceImpl
{
  public async Task<IOngoingTripSession> CreateOngoingTrip(string id, LineString route)
  {
    using var connection = db.NewConnection();
    await connection.InsertAsync(new OngoingTripDb(id, route));
    return new OngoingTripSession(id, db);
  }

  private class OngoingTripSession : IOngoingTripSession
  {
    private readonly string id;
    private readonly PostgisDatabase postgis;

    public OngoingTripSession(string id, PostgisDatabase postgis)
    {
      this.id = id;
      this.postgis = postgis;
    }

    public async Task<(double fraction, LatLng nearestPoint)> LocateOnRoute(LatLng coordinate)
    {
      using var connection = postgis.NewConnection();
      var result = await connection.QuerySingleAsync<(double fraction, LatLng nearestPoint)>(
        "select fraction, ST_LineInterpolatePoint(geometry, fraction) as nearest_point from (select ST_LineLocatePoint(geometry, @point::geometry(Point, 4326)) as fraction, geometry from ongoing_trip where id = @id) as trip",
        new { id, point = new Point(new Position(coordinate.Lng, coordinate.Lat)) }
      );
      return result;
    }

    public async Task Dispose()
    {
      using var connection = postgis.NewConnection();
      await connection.ExecuteAsync("DELETE FROM ongoing_trip WHERE liane_id = @id", new { id });
    }
  }
}