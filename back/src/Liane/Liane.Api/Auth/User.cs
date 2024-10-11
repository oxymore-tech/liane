using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Auth;

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
  string? PictureUrl,
  UserStats Stats
) : IIdentity<string>;

public sealed record FullUser(
  string? Id,
  string Phone,
  DateTime? CreatedAt,
  string FirstName,
  string LastName,
  Gender Gender,
  UserStats Stats,
  string? PictureUrl = null,
  string? PushToken = null
) : User(Id, CreatedAt, GetPseudo(FirstName, LastName), Gender, PictureUrl, Stats)
{
  public static string GetPseudo(string? firstName, string? lastName)
  {
    if (firstName is null)
    {
      return "Utilisateur inconnu";
    }

    return firstName;
  }

  public static FullUser Unknown(string userId) => new(
    userId,
    "XXXXXXXXXX",
    DateTime.UtcNow,
    "Utilisateur inconnu",
    "",
    Gender.Unspecified,
    new UserStats()
  );
}

public sealed record UserInfo(
  string FirstName,
  string LastName,
  string? PictureUrl,
  Gender Gender
);

public sealed record UserStats(int TotalTrips = 0, int TotalAvoidedEmissions = 0, int TotalCreatedTrips = 0, int TotalJoinedTrips =0);