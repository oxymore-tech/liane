using System;
using Liane.Service.Internal.RallyingPoint;
using MongoDB.Bson;

namespace Liane.Service.TripIntent;

public sealed record DbTripIntent(
    ObjectId? Id,
    string User,
    DbRallyingPoint From,
    DbRallyingPoint To,
    DateTime FromTime,
    DateTime? ToTime
);