namespace Liane.Api.Chat;

public sealed record ChatMessage(
    string Id,
    string Text,
    string CreatedAt,
    ChatUser User
);