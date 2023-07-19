using System.IO;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Postgis.Db;

namespace Liane.Service.Internal.Postgis;

public sealed class PostgisFactory
{
  public static async Task UpdateSchema(PostgisDatabase db, bool clearAll = false)
  {
    var assembly = typeof(PostgisUpdateService).Assembly;

    await using var stream = assembly.GetManifestResourceStream("Liane.Service.Resources.init.sql");
    if (stream is null)
    {
      throw new ResourceNotFoundException("Unable to find init.sql");
    }

    using var reader = new StreamReader(stream);
    var sql = await reader.ReadToEndAsync();

    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    await connection.ExecuteAsync(sql, transaction: tx);
    if (clearAll)
    {
      await connection.ExecuteAsync("DELETE FROM liane_waypoint", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM segment", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM rallying_point", transaction: tx);
    }

    tx.Commit();
  }
}