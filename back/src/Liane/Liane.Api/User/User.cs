using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.User;

public sealed record User(
    string? Id,
    string Phone,
    string Pseudo,
    Ref<User>? CreatedBy,
    DateTime? CreatedAt
) : IEntity;