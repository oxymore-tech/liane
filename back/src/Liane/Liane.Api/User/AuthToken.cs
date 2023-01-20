namespace Liane.Api.User;

public sealed record AuthToken(string AccessToken, string? RefreshToken);