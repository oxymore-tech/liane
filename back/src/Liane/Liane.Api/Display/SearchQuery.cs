using System;

namespace Liane.Api.Display;

public sealed record SearchQuery(DayOfWeek? Day = null, RallyingPoints.RallyingPoint? From = null, RallyingPoints.RallyingPoint? To = null, int StartHour = 0, int EndHour = 23, bool Mine = false);