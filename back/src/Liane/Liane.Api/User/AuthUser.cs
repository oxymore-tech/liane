namespace Liane.Api.User;

public sealed record AuthUser(string Id, bool IsAdmin, bool IsSignedUp = true);