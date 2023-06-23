using System.Data;
using Dapper;
using Npgsql;

namespace Liane.Service.Internal.Postgis.Db;

public sealed class PostgisDatabase
{
  private readonly DatabaseSettings settings;

  public PostgisDatabase(DatabaseSettings settings)
  {
    this.settings = settings;
    SqlMapper.AddTypeHandler(new GeoJsonTypeHandler());
  }

  public IDbConnection NewConnection()
  {
    var connectionString = NewConnectionString();
    var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    return connection;
  }

  private string NewConnectionString()
  {
    var builder = new NpgsqlConnectionStringBuilder
    {
      Database = "liane",
      Host = settings.Host,
      Username = settings.Username,
      Password = settings.Password,
      IncludeErrorDetail = true,
      SearchPath = "public"
    };

    return builder.ConnectionString;
  }

  public void Dispose()
  {
    NpgsqlConnection.ClearAllPools();
  }
}