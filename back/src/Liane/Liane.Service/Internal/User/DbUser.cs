using System;
using Liane.Api.User;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.User;

public sealed record DbUser(
  string Id,
  bool IsAdmin,
  string Phone,
  string? RefreshToken,
  string? Salt,
  string? PushToken,
  DateTime? CreatedAt,
  DateTime? LastConnection,
  UserInfo? UserInfo = null
) : IIdentity;