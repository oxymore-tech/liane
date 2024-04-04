namespace Liane.Api.Auth;

public sealed record AuthToken(string AccessToken, string? RefreshToken);