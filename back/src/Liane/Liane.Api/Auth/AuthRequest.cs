namespace Liane.Api.Auth;

public sealed record AuthRequest(string Phone, string Code, string? PushToken, bool WithRefresh = true);