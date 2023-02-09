using System;
using System.Collections.Immutable;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Chat;

public sealed record GroupMemberInfo(
  Ref<User.User> User,
  DateTime JoinedAt,
  DateTime? LastReadAt
): IResourceMember;

public record ConversationGroup(
  string Id,
  Ref<User.User>? CreatedBy,
  DateTime? CreatedAt,
  ImmutableList<GroupMemberInfo> Members
  ): IEntity, ISharedResource<GroupMemberInfo>;