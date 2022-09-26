using System.Collections.Immutable;

namespace Liane.Service.Internal.Push;

internal sealed record PushReceiptRequest(ImmutableList<string> Ids);