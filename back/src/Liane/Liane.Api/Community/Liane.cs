using System;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Auth;
using Liane.Api.Trip;
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
  Ref<User> CreatedBy,
  DateTime CreatedAt
) : IIdentity<Guid>, ISharedResource<LianeMember>
{
  public bool IsMember(Ref<User> user) => Members.Any(m => m.User.Id == user.Id) || PendingMembers.Any(m => m.User.Id == user.Id);
  public int TotalMembers => Members.Count + PendingMembers.Count;
}