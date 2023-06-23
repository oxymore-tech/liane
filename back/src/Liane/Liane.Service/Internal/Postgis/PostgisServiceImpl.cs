using System.Threading.Tasks;
using Liane.Service.Internal.Postgis.Db;

namespace Liane.Service.Internal.Postgis;

public sealed class PostgisServiceImpl : IPostgisService
{
  private readonly PostgisDatabase db;

  public PostgisServiceImpl(PostgisDatabase db)
  {
    this.db = db;
  }

  public Task UpdateGeometry(Api.Trip.Liane liane)
  {
    return Task.CompletedTask;
  }
}