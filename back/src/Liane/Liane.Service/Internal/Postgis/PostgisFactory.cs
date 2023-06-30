using System.IO;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Postgis.Db;
using Npgsql;

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

  public static async Task<PostgisDatabase> CreateForTest(DatabaseSettings settings)
  {
    var connectionString = new NpgsqlConnectionStringBuilder
    {
      Host = settings.Host,
      Port = settings.Port,
      Username = settings.Username,
      Password = settings.Password,
      IncludeErrorDetail = true,
      Database = "postgres"
    }.ConnectionString;
    var connection = new NpgsqlConnection(connectionString);
    connection.Open();

    var exists = (bool)((await connection.QueryFirstAsync("SELECT exists(SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower(@db));", new { db = settings.Db })).exists);
    if (!exists)
    {
      var createCommand = new NpgsqlCommand($"CREATE DATABASE {settings.Db} WITH OWNER {settings.Username};", connection);
      await createCommand.ExecuteNonQueryAsync();
    }

    await connection.CloseAsync();

    var db = new PostgisDatabase(settings);

    var databaseConnection = db.NewConnection();
    await databaseConnection.ExecuteAsync("CREATE EXTENSION IF NOT EXISTS postgis;");
    databaseConnection.Close();

    return db;
  }
}