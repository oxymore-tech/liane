using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record TrackingInfo(Ref<RallyingPoint> NextPoint, DateTime At, long Delay);