using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Display
{
    public interface IDisplayService
    {
        ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Trip.Trip> trips);

        Task<ImmutableHashSet<Trip.Trip>> Search(SearchQuery query);

        Task<ImmutableDictionary<string, RouteStat>> GetStat(ImmutableHashSet<Trip.Trip> trips, DayOfWeek? day, int? startHour = null, int? endHour = null);
    }
}