using System;
using MongoDB.Bson;

namespace Liane.Service.Internal.Trip;

public sealed record DbTripIntent(
    ObjectId Id,
    string? Title,
    string From,
    string To,
    TimeOnly GoTime,
    TimeOnly? ReturnTime,
    string CreatedBy,
    DateTime CreatedAt
);