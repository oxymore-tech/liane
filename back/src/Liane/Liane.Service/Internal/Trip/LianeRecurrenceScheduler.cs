using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Trip;

public sealed class LianeRecurrenceScheduler : CronJobService
{
  private readonly ILianeService lianeService;
  private readonly ILianeRecurrenceService lianeRecurrenceService;

  public LianeRecurrenceScheduler(ILogger<LianeRecurrenceScheduler> logger, ILianeService lianeService, ILianeRecurrenceService lianeRecurrenceService) : base(logger, "0 0 * * *", false)
  {
    this.lianeService = lianeService;
    this.lianeRecurrenceService = lianeRecurrenceService;
  }

  protected override async Task DoWork(CancellationToken cancellationToken)
  {
    Logger.Log(LogLevel.Debug, "Running recurrence scheduler...");
    var recurrences = await lianeRecurrenceService.GetUpdatableRecurrences();
    foreach (var r in recurrences)
    {
      await lianeService.CreateFromRecurrence(r, r.CreatedBy);
    }
  }
}