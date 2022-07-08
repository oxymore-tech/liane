namespace Liane.Api.User;

public sealed record AuthUser(string Phone, string Token, bool IsAdmin);