using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Chat;

public sealed record ChatMessage(
  string? Id,
  Ref<Auth.User> CreatedBy,
  DateTime? CreatedAt,
  string Text
) : IEntity<string>;