using System;
using Liane.Api.Auth;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeMember(
  [property:SerializeAsResolvedRef] Ref<User> User,
  [property:SerializeAsResolvedRef] Ref<LianeRequest> LianeRequest,
  DateTime JoinedAt,
  DateTime? LastReadAt
) : IResourceMember;