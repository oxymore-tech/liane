using System;
using System.Threading;
using System.Threading.Tasks;
using Cronos;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Timer = System.Timers.Timer;

namespace Liane.Api.Util;

public abstract class CronJobService(ILogger logger, string cronExpression, bool runImmediately, bool isEnabled = true)
  : IHostedService, IDisposable
{
  private Timer? timer;
  private readonly CronExpression expression = CronExpression.Parse(cronExpression);
  private readonly TimeZoneInfo timeZoneInfo = TimeZoneInfo.Local;
  protected readonly ILogger Logger = logger;

  public virtual async Task StartAsync(CancellationToken cancellationToken)
  {
    if (!isEnabled)
    {
      return;
    }

    try
    {
      await ScheduleJob(cancellationToken);
    }
    catch (System.Exception e)
    {
      Logger.LogError(e, "{job} : job scheduling failed", GetType().Name);
    }
  }

  private async Task ScheduleJob(CancellationToken cancellationToken)
  {
    if (runImmediately)
    {
      Logger.LogInformation("{job} : starts immediately...", GetType().Name);
      await DoWork(cancellationToken);
    }

    var next = expression.GetNextOccurrence(DateTimeOffset.Now, timeZoneInfo);
    if (next.HasValue)
    {
      var delayMs = (next.Value - DateTimeOffset.Now).TotalMilliseconds;
      if (delayMs <= 0) // prevent non-positive values from being passed into Timer
      {
        Logger.LogInformation("{job} : starts...", GetType().Name);
        await ScheduleJob(cancellationToken);
        return;
      }

      Logger.LogDebug("{job} : will run at '{at}'", GetType().Name, next.Value);
      timer = new Timer(delayMs);
      timer.Elapsed += async (_, _) =>
      {
        timer.Dispose(); // reset and dispose timer
        timer = null;

        if (!cancellationToken.IsCancellationRequested)
        {
          try
          {
            await DoWork(cancellationToken);
          }
          catch (System.Exception e)
          {
            Logger.LogError(e, "{job} : job execution failed", GetType().Name);
          }
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
    if (!isEnabled)
    {
      return;
    }

    Logger.LogInformation("{job} stopped", GetType().Name);
    timer?.Stop();
    await Task.CompletedTask;
  }

  public void Dispose()
  {
    timer?.Dispose();
  }
}