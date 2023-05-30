namespace Liane.Api.User;

public sealed record AuthUser(string Id, string Phone, bool IsAdmin, bool isSignedUp = true);