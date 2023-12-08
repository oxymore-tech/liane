using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record TrackingInfo(Ref<Liane> Liane, Car? Car, ImmutableDictionary<string, TrackedMemberLocation> OtherMembers);
public sealed record Car(DateTime At, Ref<RallyingPoint> NextPoint, long Delay, LatLng Position, ImmutableHashSet<Ref<User.User>> Members, bool IsMoving);