using MongoDB.Bson;

namespace Liane.Service.Internal.User;

public sealed record DbUser(
    ObjectId Id,
    bool IsAdmin,
    string Phone
);