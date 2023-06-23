using Wkx;

namespace Liane.Service.Internal.Postgis.Db;

public sealed record SegmentDb(string from_id, string to_id, Geometry geometry);