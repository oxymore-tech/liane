using System.Collections.Immutable;

namespace Liane.Service.Internal.Push;

internal sealed record PushTicketRequest(
    ImmutableList<string> To,
    object Data,
    string Title,
    string? Body = null,
    int? Ttl = null,
    int? Expiration = null,
    string? Priority = null,
    string? Subtitle = null,
    string? Sound = null,
    int? Badge = null,
    string? ChannelId = null
);