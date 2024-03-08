namespace Liane.Api.Auth;

public sealed record RefreshTokenRequest(string UserId, string RefreshToken);