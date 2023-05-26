using System;
using System.Linq;
using Liane.Api.Util.Ref;

namespace Liane.Api.User;

public enum Gender
{
  Man,
  Woman,
  Unspecified
}

/// <summary>
/// Public user with minimal information
/// </summary>
public record User(
  string? Id,
  DateTime? CreatedAt,
  string Pseudo,
  Gender Gender,
  string? PictureUrl
) : IIdentity;

public sealed record FullUser(
  string? Id,
  string Phone,
  DateTime? CreatedAt,
  string FirstName, // TODO make non nullable
  string LastName, // TODO make non nullable
  Gender Gender,
  string? PictureUrl = null,
  string? PushToken = null
) : User(Id, CreatedAt, ToPseudo(FirstName, LastName), Gender, PictureUrl)
{
  private static string ToPseudo(string firstName, string lastName)
  {
    return firstName + " " + (lastName.Length > 0 ? lastName[1] : 'X'); //TODO
  }
}