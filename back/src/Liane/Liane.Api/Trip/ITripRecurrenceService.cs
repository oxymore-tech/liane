using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ITripRecurrenceService : ICrudEntityService<TripRecurrence>
{
  Task Update(Ref<TripRecurrence> recurrence, DayOfWeekFlag days);
  Task<ImmutableList<TripRecurrence>> ListForCurrentUser();
  Task<TripRecurrence> GetWithResolvedRefs(Ref<TripRecurrence> recurrence);
  Task ClearForMember(string id);
  Task<IEnumerable<TripRecurrence>> GetUpdatableRecurrences(DayOfWeek? day = null);
}