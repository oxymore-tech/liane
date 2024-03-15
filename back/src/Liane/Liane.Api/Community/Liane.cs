using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record Liane(
  string Id,
  Ref<User.User> CreatedBy,
  DateTime? CreatedAt,
  ImmutableList<LianeMember> Members
) : IEntity<string>, ISharedResource<LianeMember>;