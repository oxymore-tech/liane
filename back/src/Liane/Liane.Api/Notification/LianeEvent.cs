using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Notification;

public record LianeEvent(
  string? Id,
  DateTime CreatedAt,
  string Type
) : IIdentity;

public sealed record NewLianeMemberEvent(
  string? Id,
  DateTime CreatedAt,
  Ref<User.User> NewMember,
  Ref<Trip.Liane> Liane
  ) : LianeEvent(Id, CreatedAt, nameof(NewLianeMemberEvent));
  
public sealed record LianeMemberHasLeftEvent(
  string? Id,
  DateTime CreatedAt,
  Ref<User.User> NewMember,
  Ref<Trip.Liane> Liane
) : LianeEvent(Id, CreatedAt, nameof(LianeMemberHasLeftEvent));