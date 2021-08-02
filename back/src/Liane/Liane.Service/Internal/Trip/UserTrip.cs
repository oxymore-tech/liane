using System;
using MongoDB.Bson;

namespace Liane.Service.Internal.Trip
{
    public sealed record UserTrip(
        ObjectId? _id,
        string UserId,
        Api.Trip.Location From,
        Api.Trip.Location To,
        DateTime StartTime,
        DateTime EndTime
    );
}