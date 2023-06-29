using System.Collections.Immutable;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record LinkFilterPayload(
  ImmutableList<Ref<Liane>> Lianes,
  Ref<RallyingPoint> Pickup
  );
