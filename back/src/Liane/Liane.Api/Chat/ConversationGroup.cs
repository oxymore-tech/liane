using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Chat;

public sealed record GroupMemberInfo(
  [property:SerializeAsResolvedRef]
  Ref<User.User> User,
  DateTime JoinedAt,
  DateTime? LastReadAt = null
): IResourceMember;

public sealed record ConversationGroup(
  ImmutableList<GroupMemberInfo> Members,
  string? Id = null,
  Ref<User.User>? CreatedBy = null,
  DateTime? CreatedAt = null,
  DateTime? LastMessageAt = null
) : IEntity<string>, ISharedResource<GroupMemberInfo>
{
  public static ConversationGroup CreateWithMembers(IEnumerable<Ref<User.User>> members, DateTime joinedAt)
  {
    return new ConversationGroup(members.Select(m => new GroupMemberInfo(m, joinedAt)).ToImmutableList());
  }
}