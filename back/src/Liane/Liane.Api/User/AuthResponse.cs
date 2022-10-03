namespace Liane.Api.User;

public sealed record AuthResponse(AuthUser User, string Token);