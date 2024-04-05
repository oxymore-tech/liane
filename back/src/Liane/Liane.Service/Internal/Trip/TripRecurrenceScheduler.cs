using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Trip;

public sealed class TripRecurrenceScheduler(ILogger<TripRecurrenceScheduler> logger, ITripService tripService, ITripRecurrenceService tripRecurrenceService)
  : CronJobService(logger, "0 0 * * *", false)
{
  protected override async Task DoWork(CancellationToken cancellationToken)
  {
    Logger.Log(LogLevel.Debug, "Running recurrence scheduler...");
    var recurrences = await tripRecurrenceService.GetUpdatableRecurrences();
    foreach (var r in recurrences)
    {
      await tripService.CreateFromRecurrence(r, r.CreatedBy);
    }
  }
}