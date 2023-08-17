using System.Threading.Tasks;
using Liane.Service.Internal.Postgis.Db;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Postgis;

public sealed class PostgisUpdateService
{
  private readonly ILogger<PostgisUpdateService> logger;
  private readonly PostgisDatabase postgis;

  public PostgisUpdateService(PostgisDatabase postgis, ILogger<PostgisUpdateService> logger)
  {
    this.logger = logger;
    this.postgis = postgis;
  }

  private async Task Migrate()
  {
    await PostgisFactory.UpdateSchema(postgis);
  }

  public async Task Execute()
  {
    logger.LogInformation("Start postgis update");
    await Migrate();
    logger.LogInformation("Postgis update done");
  }
}