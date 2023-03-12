namespace Liane.Api.User;

public sealed record RefreshTokenRequest(string UserId, string RefreshToken);