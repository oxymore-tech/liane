namespace Liane.Api.User;

public sealed record AuthUser(string Phone, string Token, string Id, bool IsAdmin);