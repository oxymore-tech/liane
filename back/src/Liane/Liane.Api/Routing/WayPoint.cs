using System;
using Liane.Api.Trip;

namespace Liane.Api.Routing;

public sealed record WayPoint(RallyingPoint RallyingPoint, int Duration, int Distance, DateTime Eta);