using System;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record TrackedMemberLocation(Ref<User.User> Member, Ref<Liane> Liane, DateTime At, Ref<RallyingPoint> NextPoint, long Delay, LatLng? Location, bool IsMoving = true);