using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal static class GeoJsonTextConverter
{
  public static IPosition ToGeoJsonText(this GeoJSON.Net.Geometry.IPosition position) => new Position(position.Latitude, position.Longitude, position.Altitude);
  public static GeoJSON.Net.Geometry.IPosition ToGeoJsonNet(this IPosition position) => new GeoJSON.Net.Geometry.Position(position.Latitude, position.Longitude, position.Altitude);
}