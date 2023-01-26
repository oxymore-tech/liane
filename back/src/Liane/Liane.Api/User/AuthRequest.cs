namespace Liane.Api.User;

public sealed record AuthRequest(string Phone, string Code, string? PushToken);