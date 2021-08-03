using System;
using Liane.Api.Rp;

namespace Liane.Api.Display
{
    public sealed record SearchQuery(DayOfWeek? Day = null, RallyingPoint2? From = null, RallyingPoint2? To = null, int StartHour = 0, int EndHour = 23, bool Mine = false);
}