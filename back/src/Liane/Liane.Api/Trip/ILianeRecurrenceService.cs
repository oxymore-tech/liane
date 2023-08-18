using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeRecurrenceService : ICrudEntityService<LianeRecurrence>
{
  Task Update(Ref<LianeRecurrence> recurrence, DayOfTheWeekFlag days);

}
