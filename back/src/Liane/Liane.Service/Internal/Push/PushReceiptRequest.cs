using System.Collections.Immutable;

namespace Liane.Service.Internal.Notification.Expo;

internal sealed record PushReceiptRequest(ImmutableList<string> Ids);