using System;
using Liane.Api.Rp;

namespace Liane.Api.Display
{
    public sealed record SearchQuery(DayOfWeek? Day = null, RallyingPoint? From = null, RallyingPoint? To = null, int StartHour = 0, int EndHour = 23, bool Mine = false);
}