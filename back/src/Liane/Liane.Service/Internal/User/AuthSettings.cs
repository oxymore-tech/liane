using System;

namespace Liane.Service.Internal.User;

public sealed record AuthSettings(
  TimeSpan Validity,
  string Issuer,
  string Audience,
  string SecretKey,
  string? TestAccount,
  string? TestCode,
  bool Disabled,
  int Cooldown = 30
);