using System;
using System.Threading;
using System.Threading.Tasks;
using Cronos;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Liane.Api.Util;

public abstract class CronService : BackgroundService
{
  private readonly ILogger<CronService> logger;

  private readonly string cronExpression;
  private bool runImmediatly;

  protected CronService(ILoggerFactory loggerFactory, string cronExpression, bool runImmediatly)
  {
    logger = loggerFactory.CreateLogger<CronService>();
    this.cronExpression = cronExpression;
    this.runImmediatly = runImmediatly;
  }

  protected abstract Task ExecuteCronAsync(CancellationToken cancellationToken);

  protected void LogInformation(string message, params object[] @params)
  {
    logger.LogInformation($"{GetType().Name} : {message}", @params);
  }

  protected override async Task ExecuteAsync(CancellationToken cancellationToken)
  {
    cancellationToken.Register(() => logger.LogInformation("{name} stopped", GetType().Name));

    while (!cancellationToken.IsCancellationRequested)
    {
      await WaitForNextSchedule(cancellationToken);

      try
      {
        await ExecuteCronAsync(cancellationToken);
      }
      catch (System.Exception e)
      {
        logger.LogError(e, "Error during {name}", GetType().Name);
      }
    }
  }

  private async Task WaitForNextSchedule(CancellationToken cancellationToken)
  {
    if (runImmediatly)
    {
      runImmediatly = false;
      logger.LogInformation("Job {Name} will run now", GetType().Name);
      return;
    }

    var cron = CronExpression.Parse(cronExpression);
    var now = DateTime.UtcNow;
    var nextOccurrence = cron.GetNextOccurrence(now);

    if (!nextOccurrence.HasValue)
    {
      await Task.Delay(TimeSpan.FromMinutes(5), cancellationToken);
      return;
    }

    var delay = nextOccurrence.Value.Subtract(now);

    logger.LogInformation("Job {name} will run at {next}", GetType().Name, nextOccurrence);
    await Task.Delay(delay, cancellationToken);
  }
}