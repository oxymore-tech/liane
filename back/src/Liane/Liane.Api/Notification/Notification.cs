using System;
using System.Text.Json.Serialization;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Options;

namespace Liane.Api.Notification;

public abstract record BaseNotification(
  string? Id,
  bool Seen,
  DateTime CreatedAt) : IIdentity
{
  public sealed record Notification<T>(
    string? Id,
    DateTime CreatedAt,
    T Event,
    bool Seen = false
  ) : BaseNotification(Id, Seen, CreatedAt) where T : class
  {
    public string Type => typeof(T).Name;
  }
}
  