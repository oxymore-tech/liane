using System.Collections.Immutable;
using Liane.Api.Chat;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record UnreadOverview(
  int NotificationsCount,
  ImmutableList<Ref<ConversationGroup>> Conversations
);