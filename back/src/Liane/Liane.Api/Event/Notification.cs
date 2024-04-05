using System;
using System.Collections.Immutable;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Api.Event;

public sealed record Recipient(
  Ref<Auth.User> User,
  DateTime? SeenAt = null,
  Answer? Answer = null
);

public enum Answer
{
  Accept,
  Reject
}

[Union]
public abstract record Notification : IEntity<string>
{
  public abstract string? Id { get; init; }
  public abstract Ref<Auth.User>? CreatedBy { get; init; }
  public abstract DateTime? CreatedAt { get; init; }
  public abstract ImmutableList<Recipient> Recipients { get; init; }
  public abstract ImmutableHashSet<Answer> Answers { get; init; }
  public abstract string Title { get; init; }
  public abstract string Message { get; init; }

  [BsonIgnore] public abstract string? Uri { get; init; }

  public sealed record Info(
    string? Id,
    Ref<Auth.User>? CreatedBy,
    DateTime? CreatedAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    string? Uri = null,
    DateTime? SeenAt = null
  ) : Notification;

  public sealed record NewMessage(
    string? Id,
    Ref<Auth.User>? CreatedBy,
    DateTime? CreatedAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    Ref<ConversationGroup> Conversation,
    DateTime? SeenAt = null
  ) : Notification
  {
    public override string? Uri { get; init; } = "liane://chat/" + Conversation.Id;
  }

  public sealed record Reminder(
    string? Id,
    Ref<Auth.User>? CreatedBy,
    DateTime? CreatedAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    Api.Event.Reminder Payload,
    DateTime? SeenAt = null
  ) : Notification
  {
    public override string? Uri { get; init; } = "liane://trip/" + Payload.Trip.Id;
  }

  public sealed record Event(
    string? Id,
    Ref<Auth.User>? CreatedBy,
    DateTime? CreatedAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    TripEvent Payload,
    DateTime? SeenAt = null
  ) : Notification
  {
    public override string? Uri { get; init; } = Payload switch
    {
      TripEvent.JoinRequest => "liane://join_request/" + Id,
      TripEvent.MemberAccepted m => "liane://trip/" + m.Trip.Id,
      _ => null
    };
  }
}

public sealed record Reminder(Ref<Trip.Trip> Trip, ImmutableList<WayPoint> WayPoints, bool Driver);