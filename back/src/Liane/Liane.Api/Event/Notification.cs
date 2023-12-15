using System;
using System.Collections.Immutable;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record Recipient(
  Ref<User.User> User,
  DateTime? SeenAt = null,
  Answer? Answer = null
);

public enum Answer
{
  Accept,
  Reject
}

[Union]
public abstract record Notification : IEntity
{
  public abstract string? Id { get; init; }
  public abstract Ref<User.User>? CreatedBy { get; init; }
  public abstract DateTime? CreatedAt { get; init; }
  public abstract ImmutableList<Recipient> Recipients { get; init; }
  public abstract ImmutableHashSet<Answer> Answers { get; init; }
  public abstract string Title { get; init; }
  public abstract string Message { get; init; }
  
  public string? Uri => this switch
    {
      Event e => e.Payload switch
      {
        LianeEvent.JoinRequest => "liane://join_request/" + Id,
        LianeEvent.MemberAccepted m => "liane://liane/" + m.Liane.Id,
        _ => null
      },
      NewMessage m => "liane://chat/" + m.Conversation.Id,
      _ => null
    };

  public sealed record Info(
    string? Id,
    Ref<User.User>? CreatedBy,
    DateTime? CreatedAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    DateTime? SeenAt = null
  ) : Notification;

  public sealed record NewMessage(
    string? Id,
    Ref<User.User>? CreatedBy,
    DateTime? CreatedAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    Ref<ConversationGroup> Conversation,
    DateTime? SeenAt = null
  ) : Notification;
  
  public sealed record Reminder(
    string? Id,
    Ref<User.User>? CreatedBy,
    DateTime? CreatedAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    Api.Event.Reminder Payload,
    DateTime? SeenAt = null
  ) : Notification;

  public sealed record Event(
    string? Id,
    Ref<User.User>? CreatedBy,
    DateTime? CreatedAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    LianeEvent Payload,
    DateTime? SeenAt = null
  ) : Notification;
}

public sealed record Reminder(Ref<Trip.Liane> Liane, ImmutableList<WayPoint> Trip, bool Driver);