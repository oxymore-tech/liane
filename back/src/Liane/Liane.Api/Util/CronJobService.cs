using System;
using System.Threading;
using System.Threading.Tasks;
using Cronos;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Timer = System.Timers.Timer;

namespace Liane.Api.Util;

public abstract class CronJobService : IHostedService, IDisposable
{
  private Timer? timer;
  private readonly CronExpression expression;
  private readonly TimeZoneInfo timeZoneInfo;
  private readonly bool runImmediately;
  private readonly ILogger logger;

  protected CronJobService(ILogger logger, string cronExpression, bool runImmediately)
  {
    this.logger = logger;
    expression = CronExpression.Parse(cronExpression);
    this.runImmediately = runImmediately;
    timeZoneInfo = TimeZoneInfo.Local;
  }

  public virtual Task StartAsync(CancellationToken cancellationToken)
  {
    return ScheduleJob(cancellationToken);
  }

  private async Task ScheduleJob(CancellationToken cancellationToken)
  {
    if (runImmediately)
    {
      logger.LogInformation("{job} : starts immediatly...", GetType().Name);
      await DoWork(cancellationToken);
    }

    var next = expression.GetNextOccurrence(DateTimeOffset.Now, timeZoneInfo);
    if (next.HasValue)
    {
      var delay = next.Value - DateTimeOffset.Now;
      if (delay.TotalMilliseconds <= 0) // prevent non-positive values from being passed into Timer
      {
        logger.LogInformation("{job} : starts...", GetType().Name);
        await ScheduleJob(cancellationToken);
      }

      logger.LogInformation("{job} : will run at {at}", GetType().Name, next.Value);
      timer = new Timer(delay.TotalMilliseconds);
      timer.Elapsed += async (_, _) =>
      {
        timer.Dispose(); // reset and dispose timer
        timer = null;

        if (!cancellationToken.IsCancellationRequested)
        {
          await DoWork(cancellationToken);
        }

        if (!cancellationToken.IsCancellationRequested)
        {
          await ScheduleJob(cancellationToken); // reschedule next
        }
      };
      timer.Start();
    }
  }

  protected abstract Task DoWork(CancellationToken cancellationToken);

  public virtual async Task StopAsync(CancellationToken cancellationToken)
  {
    logger.LogInformation("{job} stoped", GetType().Name);
    timer?.Stop();
    await Task.CompletedTask;
  }

  public void Dispose()
  {
    timer?.Dispose();
  }
}