using System;
using Liane.Service.Internal.Mongo.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.User;

public sealed record DbUser(
    [property:BsonSerializer(typeof(String2ObjectIdBsonSerializer))]
    string Id,
    bool IsAdmin,
    string Phone,
    string? Pseudo,
    string? RefreshToken,
    string? Salt,
    string? PushToken,
    DateTime? CreatedAt,
    DateTime? LastConnection
);