namespace Liane.Api.Auth;

public sealed record AuthUser(string Id, bool IsAdmin, bool IsSignedUp = true);