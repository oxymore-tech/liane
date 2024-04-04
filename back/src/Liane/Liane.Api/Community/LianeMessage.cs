using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public abstract record LianeMessage : IEntity<string>
{
  private LianeMessage()
  {
  }

  public abstract Ref<Auth.User>? CreatedBy { get; init; }
  public abstract DateTime? CreatedAt { get; init; }
  public abstract string? Id { get; init; }

  public sealed record Chat(
    string? Id,
    Ref<Auth.User> CreatedBy,
    DateTime? CreatedAt,
    string Text
  ) : LianeMessage;

  public sealed record Trip(
    string? Id,
    Ref<Auth.User> CreatedBy,
    DateTime? CreatedAt,
    Ref<Trip> ActualTrip
  ) : LianeMessage;
}