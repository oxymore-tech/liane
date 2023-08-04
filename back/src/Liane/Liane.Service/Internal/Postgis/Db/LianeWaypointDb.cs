using System;

namespace Liane.Service.Internal.Postgis.Db;

public sealed record LianeWaypointDb(string from_id, string to_id, string liane_id, DateTime eta);