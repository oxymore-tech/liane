using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeRecurrenceService : ICrudEntityService<LianeRecurrence>
{
  Task Update(Ref<LianeRecurrence> recurrence, DayOfTheWeekFlag days);
  Task<ImmutableList<LianeRecurrence>> ListForCurrentUser();
  Task<LianeRecurrence> GetWithResolvedRefs(Ref<LianeRecurrence> recurrence);
  Task ClearForMember(string id);
  Task<IEnumerable<LianeRecurrence>> GetUpdatableRecurrences(DayOfWeek? day = null);
}