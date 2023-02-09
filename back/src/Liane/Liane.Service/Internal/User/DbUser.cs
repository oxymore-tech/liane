using System;
using MongoDB.Bson;

namespace Liane.Service.Internal.User;

public sealed record DbUser(
    ObjectId Id,
    bool IsAdmin,
    string Phone,
    string? Pseudo,
    string? RefreshToken,
    string? Salt,
    string? PushToken,
    DateTime? CreatedAt,
    DateTime? LastConnection
);