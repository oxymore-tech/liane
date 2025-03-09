using System;
using Liane.Api.Auth;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeMember(
  [SerializeAsResolvedRef] Ref<User> User,
  [SerializeAsResolvedRef] Ref<LianeRequest> LianeRequest,
  DateTime JoinedAt,
  DateTime? LastReadAt
) : IResourceMember;