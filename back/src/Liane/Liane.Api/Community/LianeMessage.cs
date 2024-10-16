using System;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using ApiTrip = Liane.Api.Trip.Trip;

namespace Liane.Api.Community;

public sealed record LianeMessage(
  Guid Id,
  Ref<User> CreatedBy,
  DateTime? CreatedAt,
  MessageContent Content
) : IEntity<Guid>;

[Union]
public abstract record MessageContent
{
  private MessageContent(string? value)
  {
    Value = value;
  }

  public string? Value { get; init; }

  public static implicit operator MessageContent(string value) => new Text(value);

  public sealed record Text(string Value) : MessageContent(Value);

  public sealed record LianeRequestModified(string Value, Ref<LianeRequest> LianeRequest) : MessageContent(Value);

  public sealed record MemberRequested(string Value, Ref<User> User, Ref<LianeRequest> LianeRequest) : MessageContent(Value);

  public sealed record MemberAdded(string Value, Ref<User> User, Ref<LianeRequest> LianeRequest) : MessageContent(Value);

  public sealed record MemberRejected(string Value, Ref<User> User) : MessageContent(Value);

  public sealed record MemberLeft(string Value, Ref<User> User) : MessageContent(Value);

  public abstract record TripMessage(string? Value, Ref<ApiTrip> Trip) : MessageContent(Value);

  public sealed record TripAdded(string Value, Ref<ApiTrip> Trip) : TripMessage(Value, Trip);

  public sealed record TripArchived(Ref<ApiTrip> Trip) : TripMessage(null, Trip);

  public sealed record TripFinished(Ref<ApiTrip> Trip) : TripMessage(null, Trip);

  public sealed record GeolocationLevelChanged(Ref<ApiTrip> Trip, GeolocationLevel Level) : TripMessage(null, Trip);

  public sealed record MemberJoinedTrip(string Value, Ref<User> User, Ref<ApiTrip> Trip, bool TakeReturn) : TripMessage(Value, Trip);

  public sealed record MemberLeftTrip(string Value, Ref<User> User, Ref<ApiTrip> Trip) : TripMessage(Value, Trip);

  public sealed record MemberHasStarted(string Value, Ref<ApiTrip> Trip) : TripMessage(Value, Trip);

  public sealed record MemberFeedback(Ref<ApiTrip> Trip, Feedback Feedback) : TripMessage(null, Trip);
}