using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record TrackingInfo(DateTime At, Car? Car);
public sealed record Car(Ref<RallyingPoint> NextPoint, long Delay, LatLng Position, ImmutableHashSet<Ref<User.User>> Members);