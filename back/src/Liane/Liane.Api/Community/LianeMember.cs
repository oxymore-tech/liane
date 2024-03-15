using System;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeMember(
  [property: SerializeAsResolvedRef] Ref<User.User> User,
  DateTime JoinedAt,
  DateTime? LastReadAt = null
) : IResourceMember;