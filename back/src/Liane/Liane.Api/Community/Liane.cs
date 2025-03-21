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
  TimeOnly ArriveBeforeMax,
  TimeOnly ReturnAfterMax,
  DayOfWeekFlag WeekDays,
  bool Fake
) : IIdentity<Guid>, ISharedResource<LianeMember>
{
  public bool IsMember(Ref<User> user, bool includePendingMember = true)
  {
    if (Members.Any(m => m.User.Id == user.Id))
    {
      return true;
    }

    return includePendingMember && PendingMembers.Any(m => m.User.Id == user.Id);
  }

  public ImmutableList<User> GetMembers()
  {
    return Members
      .FilterSelect(m => m.User.Value)
      .ToImmutableList();
  }

  public int TotalMembers => Members.Count + PendingMembers.Count;
}