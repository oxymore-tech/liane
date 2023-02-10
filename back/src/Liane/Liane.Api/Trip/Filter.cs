using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record Filter(
  Ref<RallyingPoint>? From,
  Ref<RallyingPoint>? To,
  DateTime? GoTime,
  DateTime? ReturnTime
);