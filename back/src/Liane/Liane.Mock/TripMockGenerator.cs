using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util;
using Microsoft.Extensions.Logging;

namespace Liane.Mock;

public sealed class TripMockGenerator(ILogger<TripMockGenerator> logger, IMockService mockService, GeneratorSettings settings) : CronJobService(logger, CronExpression, false, settings.IsEnabled)
{
  private const string CronExpression = "0 22 * * *";

  protected override async Task DoWork(CancellationToken cancellationToken)
  {
   /* logger.LogInformation("Generates lianes between Toulouse and Alan.");
    var toulouse = new LatLng(43.604652, 1.444209);
    var alan = new LatLng(43.217511, 0.9125478);
    await mockService.GenerateLianes(40, toulouse, alan, 30_000);
    await mockService.GenerateLianes(40, toulouse, alan, 10_000);
    await mockService.GenerateLianes(20, toulouse, alan, 65_000);*/

    logger.LogInformation("Generates lianes between Florac and Mende.");
    var florac = new LatLng(44.324014, 3.593714);
    var mende = new LatLng(44.5167, 3.5);
    await mockService.GenerateTrips(25, florac, mende, 40_000);
    await mockService.GenerateTrips(10, florac, mende, 10_000);
  }
}