using System.Threading.Tasks;
using Dapper;
using DbUp;
using Liane.Service.Internal.Postgis.Db;

namespace Liane.Service.Internal.Postgis;

public sealed class PostgisFactory
{
  public static async Task UpdateSchema(PostgisDatabase db, bool clearAll = false)
  {
    var assembly = typeof(PostgisUpdateService).Assembly;

    var upgrader =
      DeployChanges.To
        .PostgresqlDatabase(db.NewConnectionString())
        .WithScriptsEmbeddedInAssembly(assembly)
        .LogToAutodetectedLog()
        .Build();

    var result = upgrader.PerformUpgrade();
    if (!result.Successful)
    {
      throw result.Error;
    }

    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    if (clearAll)
    {
      await connection.ExecuteAsync("DELETE FROM time_constraint", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM liane_request", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM liane_member", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM liane", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM route", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM liane_waypoint", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM segment", transaction: tx);
      await connection.ExecuteAsync("DELETE FROM rallying_point", transaction: tx);
    }

    tx.Commit();
  }
}