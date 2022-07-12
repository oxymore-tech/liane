using System;
using Liane.Service.Internal.RallyingPoints;
using MongoDB.Bson;

namespace Liane.Service.Internal.Trip;

public sealed record DbTripIntent(
    ObjectId? Id,
    string User,
    DbRallyingPoint From,
    DbRallyingPoint To,
    DateTime FromTime,
    DateTime? ToTime
);