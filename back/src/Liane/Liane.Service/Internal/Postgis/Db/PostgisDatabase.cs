using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Routing;
using Liane.Api.Util;
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
  private readonly Dictionary<Type, ICopyTypeMapper> typeMappers = new ();

  public PostgisDatabase(DatabaseSettings settings, ILoggerFactory loggerFactory)
  {
    this.settings = settings;
    SqlMapper.AddTypeHandler(new LineStringTypeHandler());
    SqlMapper.AddTypeHandler(new PointTypeHandler());
    SqlMapper.AddTypeHandler(new LatLngTypeHandler());
    SqlMapper.TypeMapProvider = t => new SnakeCaseTypeMap(t);
    AddCopyTypeMapper<LatLng>(new LatLngCopyTypeMapper());
    var builder = new NpgsqlDataSourceBuilder(NewConnectionString());
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
  
  public async Task<IDatabaseExportContext> BeginTextExport<T>(Filter<T>? filter = default, Func<Mapper.ColumnMapping, bool>? columnFilter = default)
  {
    var columns = Mapper.GetColumns<T>();
    if (columnFilter is not null)
    {
      columns = columns.Where(columnFilter).ToImmutableList();
    }
    var selectedValues = string.Join(",", columns.Select(c => typeMappers.TryGetValue(c.PropertyInfo.PropertyType, out ICopyTypeMapper? value) ? $"{value.Export(c.ColumnName)} as {c.ColumnName}" : c.ColumnName));
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
    var connection = dataSource.OpenConnection(); 
    var reader= await connection.BeginTextExportAsync($"COPY ({sql}) TO STDOUT with (format csv, header, delimiter ',', null '')"); 
    return new ExportContext(reader, connection);
  }
  
  
  public async Task<IDatabaseImportContext> BeginTextImport<T>(Func<Mapper.ColumnMapping, bool>? columnFilter = default)
  {
    var connection = dataSource.OpenConnection();
    var tx = connection.BeginTransaction();
    var table = Mapper.GetTableName<T>();
    var columns = Mapper.GetColumns<T>();
    if (columnFilter is not null)
    {
      columns = columns.Where(columnFilter).ToImmutableList();
    }
    
      await using (var cmd = connection.CreateCommand())
      {
        cmd.CommandText = $"create temp table {table}_import on commit drop as select * from {table} where false;";
        cmd.Transaction = tx;

        await cmd.ExecuteNonQueryAsync();
      }

      foreach (var column in columns.Where(c => typeMappers.ContainsKey(c.PropertyInfo.PropertyType)))
      {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"alter table {table}_import alter column {column.ColumnName} TYPE text;";
        cmd.Transaction = tx;
        await cmd.ExecuteNonQueryAsync();
      }

      var writer = await connection.BeginTextImportAsync($"COPY {table}_import ({string.Join(",", columns)}) FROM STDOUT (format csv, header, delimiter ',', null '')");

      var finalize = async () =>
      {
       
        await using (var cmd = connection.CreateCommand())
        {
          var transformedColumns = columns.Select(c => typeMappers.TryGetValue(c.PropertyInfo.PropertyType, out var alteration) ? alteration.Import(c.ColumnName) : c.ColumnName);
          cmd.CommandText = $"INSERT INTO {table} SELECT {string.Join(",", transformedColumns)} FROM {table}_import ON CONFLICT DO NOTHING";
          cmd.Transaction = tx;

          await cmd.ExecuteNonQueryAsync();
        }
        await tx.CommitAsync();
        await tx.DisposeAsync();
      };
      return new ImportContext(finalize, writer, connection);
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
  
  
  private sealed class ExportContext : IDatabaseExportContext
  {
    private readonly NpgsqlConnection connection;
    private readonly TextReader textReader;
    public ExportContext(TextReader textReader, NpgsqlConnection connection)
    {
      this.textReader = textReader;
      this.connection = connection;
    }

    public void Dispose()
    {
      connection.Dispose();
      textReader.Dispose();
    }

    public async Task<Stream> GetStream()
    {
      var stream = new MemoryStream();
    
      var textBuffer = new char[4096];
      while (await textReader.ReadBlockAsync(textBuffer) > 0)
      {
        var bytes = Encoding.Unicode.GetBytes(textBuffer);
        await stream.WriteAsync(bytes);
      }
      await stream.FlushAsync();
      stream.Position = 0;
      return stream;
    }

  }
  
  private sealed class ImportContext : IDatabaseImportContext
  {
    private readonly TextWriter textWriter;
    private readonly Func<Task> finalize;
    private readonly NpgsqlConnection connection;
    public ImportContext(Func<Task> finalize, TextWriter textWriter, NpgsqlConnection connection)
    {
      this.finalize = finalize;
      this.textWriter = textWriter;
      this.connection = connection;
    }

    public void Dispose()
    {
      connection.Dispose();
    }

    public async Task Write(Stream stream, Encoding? encoding = default)
    {
      using var reader = new StreamReader(stream, encoding ?? Encoding.Unicode, true);
      string? line;
      while ((line = await reader.ReadLineAsync()) is not null)
      {
        await textWriter.WriteLineAsync(line);
      }
      await textWriter.DisposeAsync();
      await finalize();
    }

  }
}