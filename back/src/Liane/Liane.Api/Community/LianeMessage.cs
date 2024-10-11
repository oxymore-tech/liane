using System;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;
using ApiTrip = Liane.Api.Trip.Trip;

namespace Liane.Api.Community;

public sealed record LianeMessage(
  string Id,
  Ref<User> CreatedBy,
  DateTime? CreatedAt,
  MessageContent Content
) : IEntity<string>;

[Union]
public abstract record MessageContent
{
  private MessageContent()
  {
  }

  public abstract string Value { get; init; }

  public static implicit operator MessageContent(string value) => new Text(value);

  public sealed record Text(string Value) : MessageContent;

  public sealed record LianeRequestModified(string Value, Ref<LianeRequest> LianeRequest) : MessageContent;

  public sealed record MemberRequested(string Value, Ref<User> User, Ref<LianeRequest> LianeRequest) : MessageContent;

  public sealed record MemberAdded(string Value, Ref<User> User, Ref<LianeRequest> LianeRequest) : MessageContent;

  public sealed record MemberRejected(string Value, Ref<User> User) : MessageContent;
  
  public sealed record MemberLeft(string Value, Ref<User> User) : MessageContent;
  
  public sealed record TripAdded(string Value, Ref<ApiTrip> Trip) : MessageContent;
  
  public sealed record TripRemoved(string Value, Ref<ApiTrip> Trip) : MessageContent;
  
  public sealed record MemberJoinedTrip(string Value, Ref<User> User, Ref<ApiTrip> Trip, bool TakeReturn) : MessageContent;
  
  public sealed record MemberLeftTrip(string Value, Ref<User> User, Ref<ApiTrip> Trip) : MessageContent;
}
