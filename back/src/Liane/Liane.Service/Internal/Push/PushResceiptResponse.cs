using System.Collections.Immutable;

namespace Liane.Service.Internal.Push;

internal sealed record PushResceiptResponse(ImmutableDictionary<string, PushTicketDeliveryStatus> Data, ImmutableList<PushReceiptErrorInformation> Errors);

internal sealed record PushTicketDeliveryStatus(string Status, string Message, object Details);

internal sealed record PushReceiptErrorInformation(string Code, string Message);