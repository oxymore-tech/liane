using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db;

public sealed record SegmentDb(string from_id, string to_id, LineString geometry);