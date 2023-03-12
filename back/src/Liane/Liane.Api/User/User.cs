using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.User;

/// <summary>
/// Public user with minimal information
/// </summary>
public record User(
  string? Id,
  string? Pseudo,
  DateTime? CreatedAt
) : IIdentity;

public sealed record FullUser(
  string? Id,
  string Phone,
  string? Pseudo,
  string? PushToken,
  DateTime? CreatedAt
) : User(Id, Pseudo, CreatedAt);