using System;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Liane.Mock;

public sealed class LianeMockCronService : BackgroundService
{
  private const string CronExpression = "0 22 * * *";

  private readonly ILogger<LianeMockCronService> logger;
  private readonly IMockService mockService;
  private bool runImmediately = false;

  public LianeMockCronService(ILogger<LianeMockCronService> logger, IMockService mockService)
  {
    this.logger = logger;
    this.mockService = mockService;
  }

  protected override async Task ExecuteAsync(CancellationToken cancellationToken)
  {
    cancellationToken.Register(() => logger.LogInformation("{name} stopped", nameof(LianeMockCronService)));

    while (!cancellationToken.IsCancellationRequested)
    {
      await WaitForNextSchedule();

      try
      {
        await GenerateLianes();
      }
      catch (Exception e)
      {
        logger.LogError(e, "Error during {name}", nameof(LianeMockCronService));
      }
    }
  }

  private async Task WaitForNextSchedule()
  {
    if (runImmediately)
    {
      runImmediately = false;
      logger.LogInformation("Job {0} will run now", nameof(LianeMockCronService));
      return;
    }

    var cron = Cronos.CronExpression.Parse(CronExpression);
    var now = DateTimeOffset.UtcNow.UtcDateTime;
    var nextOccurrence = cron.GetNextOccurrence(now);

    if (!nextOccurrence.HasValue)
    {
      await Task.Delay(TimeSpan.FromMinutes(5));
      return;
    }

    var delay = nextOccurrence.Value.Subtract(now);

    logger.LogInformation("Job {name} will run at {next}", nameof(LianeMockCronService), nextOccurrence);
    await Task.Delay(delay);
  }

  private async Task GenerateLianes()
  {
    logger.LogInformation("Generates lianes between Toulouse and Alan.");
    var toulouse = new LatLng(43.604652, 1.444209);
    var alan = new LatLng(43.217511, 0.9125478);
    await mockService.GenerateLianes(40, toulouse, alan, 30_000);
    await mockService.GenerateLianes(40, toulouse, alan, 10_000);
    await mockService.GenerateLianes(20, toulouse, alan, 65_000);

    logger.LogInformation("Generates lianes between Florac and Mende.");
    var florac = new LatLng(44.324014, 3.593714);
    var mende = new LatLng(44.5167, 3.5);
    await mockService.GenerateLianes(40, florac, mende, 40_000);
    await mockService.GenerateLianes(40, toulouse, alan, 10_000);
  }
}