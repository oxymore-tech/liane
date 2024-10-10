using System;
using System.Collections.Immutable;

namespace Liane.Api.Event;

public sealed record UnreadOverview(
  ImmutableList<Guid> Notifications
);