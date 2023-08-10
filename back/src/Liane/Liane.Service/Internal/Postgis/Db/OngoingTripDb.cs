using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db;

public sealed record OngoingTripDb(string id, LineString geometry);