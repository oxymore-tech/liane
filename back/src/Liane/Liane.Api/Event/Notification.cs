using System;
using System.Collections.Immutable;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record Notification(
  Guid Id,
  Ref<User>? CreatedBy,
  DateTime? CreatedAt,
  string Title,
  string Message,
  string? Uri
) : IEntity<Guid>;