using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Chat;

public sealed record ChatMessage(
  string? Id,
  Ref<User.User> CreatedBy,
  DateTime? CreatedAt,
  string Text
) : IEntity<string>;