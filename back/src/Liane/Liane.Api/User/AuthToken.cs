namespace Liane.Api.User;

public sealed record AuthToken(string AccessToken, long ExpiresInMilli, string? RefreshToken);