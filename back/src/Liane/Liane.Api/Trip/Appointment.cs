using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record Appointment(Ref<Liane> Liane, RallyingPoint RallyingPoint, DateTime At);