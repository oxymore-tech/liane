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

  public string AsText() =>
    this switch
    {
      Text text => text.Value,
      Trip => "Nouveau trajet",
      _ => throw new ArgumentOutOfRangeException()
    };

  public static implicit operator MessageContent(string value) => new Text(value);

  public sealed record Text(string Value) : MessageContent;

  public sealed record Trip(Ref<ApiTrip> Value) : MessageContent;
}