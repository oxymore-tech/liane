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
    SqlMapper.AddTypeHandler(new LineStringTypeHandler());
    SqlMapper.AddTypeHandler(new PointTypeHandler());
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
      Database = settings.Db,
      Host = settings.Host,
      Username = settings.Username,
      Password = settings.Password,
      IncludeErrorDetail = true
    };

    return builder.ConnectionString;
  }

  public void Dispose()
  {
    NpgsqlConnection.ClearAllPools();
  }
}