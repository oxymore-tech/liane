using System;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record Liane(
  Guid Id,
  ImmutableList<LianeMember> Members,
  ImmutableList<LianeMember> PendingMembers,
  ImmutableList<RallyingPoint> WayPoints,
  bool RoundTrip,
  TimeOnly ArriveBefore,
  TimeOnly ReturnAfter,
  DayOfWeekFlag WeekDays,
  User CreatedBy,
  DateTime CreatedAt
) : IIdentity<Guid>, ISharedResource<LianeMember>
{
  public bool IsMember(Ref<User> user, bool pendingMember = true)
  {
    if (Members.Any(m => m.User.Id == user.Id))
    {
      return true;
    }

    if (!pendingMember)
    {
      return false;
    }

    return user.Id == CreatedBy.Id
           || PendingMembers.Any(m => m.User.Id == user.Id);
  }

  public ImmutableList<User> GetMembers()
  {
    if (Members.IsEmpty)
    {
      return ImmutableList.Create(CreatedBy);
    }

    return Members
      .FilterSelect(m => m.User.Value)
      .ToImmutableList();
  }

  public int TotalMembers => Members.Count + PendingMembers.Count;
}