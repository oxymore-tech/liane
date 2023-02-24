using System.Threading;
using System.Threading.Tasks;
using CronScheduler.Extensions.Scheduler;
using Liane.Api.Routing;
using Microsoft.Extensions.Logging;

namespace Liane.Mock;

public sealed class LianeMockCronService : IScheduledJob
{
  private readonly ILogger<LianeMockCronService> logger;
  private readonly IMockService mockService;

  public LianeMockCronService(ILogger<LianeMockCronService> logger, IMockService mockService)
  {
    this.logger = logger;
    this.mockService = mockService;
  }

  public async Task ExecuteAsync(CancellationToken cancellationToken)
  {
    logger.LogInformation("Generates lianes between Toulouse and Alan.");
    var toulouse = new LatLng(43.604652, 1.444209);
    var alan = new LatLng(43.217511, 0.9125478);
    await mockService.GenerateLianes(50, toulouse, alan, 40_000);

    logger.LogInformation("Generates lianes between Florac and Mende.");
    var florac = new LatLng(44.324014, 3.593714);
    var mende = new LatLng(44.5167, 3.5);
    await mockService.GenerateLianes(50, florac, mende, 40_000);
  }

  public string Name => "liane-mock";
  
}
