using System;

namespace Liane.Service.Internal.Postgis.Db;

public sealed record LianeWayPointDb(string from_id, string to_id, string liane_id, DateTime eta);