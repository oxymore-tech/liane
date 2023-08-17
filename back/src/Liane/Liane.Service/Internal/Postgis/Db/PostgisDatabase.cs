using System;
using System.Data;
using Dapper;
using Liane.Service.Internal.Postgis.Db.Handler;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Liane.Service.Internal.Postgis.Db;

public sealed class PostgisDatabase : IDisposable
{
  private readonly DatabaseSettings settings;
  private readonly NpgsqlDataSource dataSource;

  public PostgisDatabase(DatabaseSettings settings, ILoggerFactory loggerFactory)
  {
    this.settings = settings;
    SqlMapper.AddTypeHandler(new LineStringTypeHandler());
    SqlMapper.AddTypeHandler(new PointTypeHandler());
    SqlMapper.AddTypeHandler(new LatLngTypeHandler());
    SqlMapper.TypeMapProvider = t => new SnakeCaseTypeMap(t);
    var builder = new NpgsqlDataSourceBuilder(NewConnectionString());
    builder.UseGeoJson();
    builder.UseLoggerFactory(loggerFactory);
    dataSource = builder.Build();
  }

  public IDbConnection NewConnection()
  {
    return dataSource.OpenConnection();
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
    dataSource.Dispose();
  }
}