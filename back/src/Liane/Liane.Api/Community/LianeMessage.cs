using System;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;

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

  public static implicit operator MessageContent(string value) => new Text(value);

  public sealed record Text(string Value) : MessageContent;

  public sealed record LaunchTrip(Ref<Trip.Trip> Trip) : MessageContent;
}