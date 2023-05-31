using System;
using System.Collections.Immutable;
using Liane.Api.Chat;
using Liane.Api.Trip;
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
public abstract record Notification : IIdentity
{
  public abstract string? Id { get; init; }
  public abstract Ref<User.User>? Sender { get; init; }
  public abstract DateTime SentAt { get; init; }
  public abstract ImmutableList<Recipient> Recipients { get; init; }
  public abstract ImmutableHashSet<Answer> Answers { get; init; }
  public abstract string Title { get; init; }
  public abstract string Message { get; init; }

  public sealed record Info(
    string? Id,
    Ref<User.User>? Sender,
    DateTime SentAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message
  ) : Notification;

  public sealed record NewMessage(
    string? Id,
    Ref<User.User>? Sender,
    DateTime SentAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    Ref<ConversationGroup> Conversation
  ) : Notification;
  
  public sealed record Reminder(
    string? Id,
    Ref<User.User>? Sender,
    DateTime SentAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    Api.Event.Reminder Payload
  ) : Notification;

  public sealed record Event(
    string? Id,
    Ref<User.User>? Sender,
    DateTime SentAt,
    ImmutableList<Recipient> Recipients,
    ImmutableHashSet<Answer> Answers,
    string Title,
    string Message,
    LianeEvent Payload
  ) : Notification;
}

public sealed record Reminder(Ref<Trip.Liane> Liane, Ref<RallyingPoint> RallyingPoint, DateTime At);