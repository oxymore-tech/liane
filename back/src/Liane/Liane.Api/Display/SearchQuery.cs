using System;

namespace Liane.Api.Display
{
    public sealed record SearchQuery(DayOfWeek? Day = null, RallyingPoint? Start = null, RallyingPoint? End = null, int From = 0, int To = 23, bool Mine = false);
}