using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record TrackingInfo(
  Ref<Trip> Trip,
  Car? Car,
  ImmutableDictionary<string, TrackedMemberLocation> OtherMembers
);

public sealed record Car(
  DateTime At,
  Ref<RallyingPoint> NextPoint,
  long Delay,
  LatLng Position,
  ImmutableHashSet<Ref<Auth.User>> Members,
  bool IsMoving
);

public sealed record TrackedMemberLocation(
  Ref<Auth.User> Member,
  Ref<Trip> Trip,
  DateTime At,
  Ref<RallyingPoint> NextPoint,
  long Delay,
  LatLng? Location,
  bool IsMoving = true
);