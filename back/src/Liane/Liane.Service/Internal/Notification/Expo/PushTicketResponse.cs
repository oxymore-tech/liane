using System.Collections.Generic;

namespace Liane.Service.Internal.Notification.Expo;

internal sealed record PushTicketResponse(List<PushTicketStatus> Data, List<PushTicketErrors> Errors);

internal sealed record PushTicketStatus(string Status, string Id, string Message, object Details);

internal sealed record PushTicketErrors(int Code, string Message);