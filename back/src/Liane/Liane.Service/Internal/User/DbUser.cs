using System;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.User;

public sealed record DbUser(
  //  [property:BsonSerializer(typeof(String2ObjectIdBsonSerializer))]
    string Id,
    bool IsAdmin,
    string Phone,
    string? Pseudo,
    string? RefreshToken,
    string? Salt,
    string? PushToken,
    DateTime? CreatedAt,
    DateTime? LastConnection
) : IIdentity;