using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record EventFilter(
  bool ForCurrentUser,
  Ref<Trip.Liane>? Liane
);