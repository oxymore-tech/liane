using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Notification;

public abstract record LianeEvent(
  string? Id,
  DateTime? CreatedAt,
  Ref<User.User> CreatedBy
) : IEntity, IUnion
{
  public sealed record NewMember(
    string? Id,
    DateTime? CreatedAt,
    Ref<User.User> CreatedBy,
    Ref<Trip.Liane> Liane
    ) : LianeEvent(Id, CreatedAt, CreatedBy);
    
  public sealed record MemberHasLeft(
    string? Id,
    DateTime? CreatedAt,
    Ref<User.User> CreatedBy,
    Ref<Trip.Liane> Liane
  ) : LianeEvent(Id, CreatedAt, CreatedBy);
}

