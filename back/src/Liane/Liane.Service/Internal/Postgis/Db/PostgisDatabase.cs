using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.IO;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Community;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Postgis.Db.Copy;
using Liane.Service.Internal.Postgis.Db.Handler;
using Liane.Service.Internal.Util.Sql;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Liane.Service.Internal.Postgis.Db;

public sealed class PostgisDatabase : IDisposable
{
  private readonly DatabaseSettings settings;
  private readonly NpgsqlDataSource dataSource;
  private readonly Dictionary<Type, ICopyTypeMapper> typeMappers = new();

  public PostgisDatabase(DatabaseSettings settings, ILoggerFactory loggerFactory, JsonSerializerOptions jsonSerializerOptions)
  {
    this.settings = settings;
    SqlMapper.AddTypeHandler(new DayOfWeekFlagTypeHandler());
    SqlMapper.AddTypeHandler(new LineStringTypeHandler());
    SqlMapper.AddTypeHandler(new PointTypeHandler());
    SqlMapper.AddTypeHandler(new LatLngTypeHandler());
    SqlMapper.AddTypeHandler(new TimeOnlyHandler());
    SqlMapper.AddTypeHandler(new RefTypeHandler<RallyingPoint>());
    SqlMapper.AddTypeHandler(new RefTypeHandler<Api.Auth.User>());
    SqlMapper.AddTypeHandler(new JsonTypeHandler<MessageContent>(jsonSerializerOptions));
    SqlMapper.TypeMapProvider = t => new SnakeCaseTypeMap(t);
    AddCopyTypeMapper<LatLng>(new LatLngCopyTypeMapper());
    var connectionString = NewConnectionString();
    var builder = new NpgsqlDataSourceBuilder(connectionString);
    builder.UseGeoJson();
    builder.UseLoggerFactory(loggerFactory);
    dataSource = builder.Build();
  }

  public IDbConnection NewConnection()
  {
    return dataSource.OpenConnection();
  }

  private void AddCopyTypeMapper<T>(ICopyTypeMapper mapper)
  {
    typeMappers.Add(typeof(T), mapper);
  }

  public async Task ExportTableAsCsv<T>(Stream output, Filter<T>? filter = default, params Expression<Func<T, object?>>[] columnFilter)
  {
    var ignoreColumns = columnFilter.Select(s => (FieldDefinition<T>)s).ToImmutableHashSet();
    var columns = Mapper.GetColumns<T>().Where(c => !ignoreColumns.Contains(c)).ToImmutableList();

    var namedParams = new NamedParams();

    var selectedValues = string.Join(",",
      columns.Select(c =>
      {
        var column = c.ToSql(namedParams);
        return typeMappers.TryGetValue(c.ColumnType, out var value) ? $"{value.Export(column)} as {column}" : column;
      }));
    var sql = new StringBuilder($"SELECT {selectedValues} FROM {Mapper.GetTableName<T>()}");

    /* TODO manually transform filter as COPY does not support @parameters
     if (filter is not null){
     var namedParams = new NamedParams();
     var sqlFilter = filter.ToSql(namedParams);
    if (!string.IsNullOrEmpty(sqlFilter))
    {
      sql.Append($"WHERE {sqlFilter}");
    }
    }
    */
    await using var connection = await dataSource.OpenConnectionAsync();
    {
      using var reader = await connection.BeginTextExportAsync($"COPY ({sql}) TO STDOUT with (format csv, header, delimiter ',', null '')");

      await using var streamWriter = new StreamWriter(output, Encoding.UTF8, leaveOpen: true);
      while (await reader.ReadLineAsync() is { } line)
      {
        await streamWriter.WriteLineAsync(line);
      }

      await streamWriter.FlushAsync();
    }
  }

  public async Task ImportTableAsCsv<T>(Stream input, params Expression<Func<T, object?>>[] columnFilter)
  {
    await using var connection = await dataSource.OpenConnectionAsync();
    await using var tx = await connection.BeginTransactionAsync();
    var table = Mapper.GetTableName<T>();
    var filter = columnFilter.Select(s => (FieldDefinition<T>)s).ToImmutableHashSet();
    var columns = Mapper.GetColumns<T>().Where(c => !filter.Contains(c)).ToImmutableList();

    await using (var cmd = connection.CreateCommand())
    {
      cmd.CommandText = $"create temp table {table}_import on commit drop as select * from {table} where false;";
      cmd.Transaction = tx;

      await cmd.ExecuteNonQueryAsync();
    }

    var namedParams = new NamedParams();
    foreach (var column in columns.Where(c => typeMappers.ContainsKey(c.ColumnType)))
    {
      await using var cmd = connection.CreateCommand();
      cmd.CommandText = $"alter table {table}_import alter column {column.ToSql(namedParams)} TYPE text;";
      cmd.Transaction = tx;
      await cmd.ExecuteNonQueryAsync();
    }

    {
      await using var writer =
        await connection.BeginTextImportAsync($"COPY {table}_import ({string.Join(",", columns.Select(c => c.ToSql(namedParams)))}) FROM STDOUT (format csv, header, delimiter ',', null '')");
      using var reader = new StreamReader(input, Encoding.UTF8, true);
      while (await reader.ReadLineAsync() is { } line)
      {
        await writer.WriteLineAsync(line);
      }

      await writer.FlushAsync();
    }

    await using (var cmd = connection.CreateCommand())
    {
      var transformedColumns = columns.Select(c =>
      {
        var columnName = c.ToSql(namedParams);
        return typeMappers.TryGetValue(c.ColumnType, out var alteration) ? alteration.Import(columnName) : columnName;
      });
      cmd.CommandText = $"INSERT INTO {table} SELECT {string.Join(",", transformedColumns)} FROM {table}_import ON CONFLICT DO NOTHING";
      cmd.Transaction = tx;

      await cmd.ExecuteNonQueryAsync();
    }

    await tx.CommitAsync();
  }

  public string NewConnectionString()
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