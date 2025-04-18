using System;
using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api.Image;
using Liane.Api.Util;
using Liane.Service.Internal.Address;
using Liane.Service.Internal.Community;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Image;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Mongo.Migration;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Trip.Geolocation;
using Liane.Service.Internal.User;
using Liane.Service.Internal.Util;
using Liane.Web.Binder;
using Liane.Web.Hubs;
using Liane.Web.Internal.Auth;
using Liane.Web.Internal.Exception;
using Liane.Web.Internal.File;
using Liane.Web.Internal.Json;
using Liane.Web.Internal.Startup;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using NLog;
using NLog.Config;
using NLog.Filters;
using NLog.Layouts;
using NLog.Targets;
using NLog.Targets.Wrappers;
using NLog.Web;
using NLog.Web.LayoutRenderers;
using NSwag;
using LogLevel = NLog.LogLevel;

namespace Liane.Web;

public static class Startup
{
  public const string RequireAuthPolicy = nameof(RequireAuthPolicy);

  private static void ConfigureLianeServices(WebHostBuilderContext context, IServiceCollection services)
  {
    services.AddService<OsrmClient>();
    services.AddService<RoutingServiceImpl>();
    services.AddService<AddressServiceNominatimImpl>();
    services.AddSettings<OsrmSettings>(context);
    services.AddSettings<NominatimSettings>(context);

    services.AddSettings<DatabaseSettings>(context);
    services.AddService<PostgisDatabase>();
    services.AddService<PostgisUpdateService>();
    services.AddService<PostgisServiceImpl>();

    services.AddService<ImageServiceImpl>();
    services.AddSettings<CloudflareSettings>(context);
    services.AddHttpClient<IImageService, ImageServiceImpl>();

    services.AddSettings<MongoSettings>(context);
    services.AddService<MigrationService>();

    services.AddService<CurrentContextImpl>();
    services.AddSettings<SmsSettings>(context);
    services.AddService<SmsSender>();
    services.AddSettings<AuthSettings>(context);
    services.AddService<AuthServiceImpl>();
    services.AddService<UserServiceImpl>();
    services.AddService<UserStatServiceImpl>();
    services.AddService<HubServiceImpl>();
    services.AddService<DeleteAccountServiceImpl>();

    services.AddService<RallyingPointServiceImpl>();
    services.AddService<RallyingPointRequestServiceImpl>();
    services.AddService<RallyingPointGenerator>();
    services.AddService<TripServiceImpl>();
    services.AddService<LianeTrackerServiceImpl>();
    services.AddService<LianeTrackerCache>();

    services.AddService<LianeRequestFetcher>();
    services.AddService<LianeFetcher>();
    services.AddService<LianeMatcher>();
    services.AddService<LianeServiceImpl>();
    services.AddService<LianeMessageServiceImpl>();

    services.AddService<PushServiceImpl>();

    services.AddSettings<FirebaseSettings>(context);
    services.AddService<FirebaseMessagingImpl>();

    services.AddEventListeners();

    services.AddSingleton(MongoFactory.Create);

    services.AddHostedService<LianeStatusUpdate>();

    services.AddHealthChecks();
  }

  public static async Task StartCurrentModule(string[] args)
  {
    var logger = ConfigureLogger();
    try
    {
      await StartCurrentModuleWeb(args);
    }
    catch (Exception e)
    {
      logger.Fatal(e);
    }
    finally
    {
      LogManager.Shutdown();
    }
  }

  private static Logger ConfigureLogger()
  {
    var loggingConfiguration = new LoggingConfiguration();

#pragma warning disable CS0618 // Type or member is obsolete
    AspNetLayoutRendererBase.Register("trace_id",
      (_, _, _) => MappedDiagnosticsLogicalContext.GetObject("TraceId"));
    AspNetLayoutRendererBase.Register("span_id",
      (_, _, _) => MappedDiagnosticsLogicalContext.GetObject("SpanId"));
    AspNetLayoutRendererBase.Register("user_id", (_, httpContext, _) => httpContext.User.Identity?.Name);
    AspNetLayoutRendererBase.Register("request_path",
      (_, _, _) => MappedDiagnosticsLogicalContext.GetObject("RequestPath"));
#pragma warning restore CS0618 // Type or member is obsolete

    Layout jsonLayout = new JsonLayout
    {
      Attributes =
      {
        new JsonAttribute("date", "${longdate}"),
        new JsonAttribute("thread_id", "${threadid}"),
        new JsonAttribute("trace_id", "${trace_id}"),
        new JsonAttribute("span_id", "${span_id}"),
        new JsonAttribute("tenant_id", "${tenant_id}"),
        new JsonAttribute("user_id", "${user_id}"),
        new JsonAttribute("request_path", "${request_path}"),
        new JsonAttribute("duration", "${event-properties:ElapsedMilliseconds}"),
        new JsonAttribute("level", "${level:upperCase=true}"),
        new JsonAttribute("logger", "${logger}"),
        new JsonAttribute("message", "${message}"),
        new JsonAttribute("exception", "${exception:format=ToString}")
      }
    };
    Layout devLayout = new SimpleLayout(
      "${longdate} | ${uppercase:${level:padding=5}} | ${threadid:padding=3} | ${logger:padding=40:fixedLength=true:alignmentOnTruncation=right} | ${message} ${exception:format=ToString}");
    var coloredConsoleTarget = new ColoredConsoleTarget
    {
      RowHighlightingRules =
      {
        new ConsoleRowHighlightingRule
          { Condition = "level <= LogLevel.Debug", ForegroundColor = ConsoleOutputColor.DarkGray },
        new ConsoleRowHighlightingRule
          { Condition = "level == LogLevel.Info", ForegroundColor = ConsoleOutputColor.DarkBlue },
        new ConsoleRowHighlightingRule
          { Condition = "level == LogLevel.Warn", ForegroundColor = ConsoleOutputColor.DarkYellow },
        new ConsoleRowHighlightingRule
          { Condition = "level >= LogLevel.Error", ForegroundColor = ConsoleOutputColor.Red }
      },
      Layout = Env.IsDevelopment() ? devLayout : jsonLayout
    };
    var consoleTarget = new AsyncTargetWrapper("console", coloredConsoleTarget);
    loggingConfiguration.AddTarget(consoleTarget);

    var requestLoggingRule = new LoggingRule("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Info, LogLevel.Info, consoleTarget);

    requestLoggingRule.Filters.Add(
      new WhenMethodFilter(logEvent =>
      {
        if (!logEvent.Properties.TryGetValue("Path", out var path))
        {
          return FilterResult.LogFinal;
        }

        return path?.ToString() == "/health" ? FilterResult.IgnoreFinal : FilterResult.LogFinal;
      })
    );

    loggingConfiguration.AddRule(requestLoggingRule);
    loggingConfiguration.AddRule(LogLevel.Debug, LogLevel.Fatal, consoleTarget);

    var logFactory = LogManager.Setup().LoadConfiguration(loggingConfiguration);
    return logFactory.GetCurrentClassLogger();
  }

  private static void ConfigureServices(WebHostBuilderContext context, IServiceCollection services)
  {
    services.AddService<FileStreamResultExecutor>();
    services.AddControllers(options => { options.ModelBinderProviders.Insert(0, new BindersProvider()); })
      .AddJsonOptions(options => { JsonSerializerSettings.ConfigureOptions(options.JsonSerializerOptions); });
    services.AddCors(options =>
      {
        options.AddPolicy("AllowLocal",
          p => p.WithOrigins("http://localhost:3000", "http://localhost:3001")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
      }
    );

    services.AddControllers(options =>
    {
      options.Filters.Add<ExceptionFilter>();
      // options.Filters.Add<RequestLoggerFilter>();
    });
    services.AddService<HttpContextAccessor>();
    services.AddSwaggerDocument(settings =>
    {
      settings.Title = "Liane API";
      settings.Version = Assembly.GetExecutingAssembly()
        .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
        ?.InformationalVersion;
      settings.AddSecurity("Bearer", new OpenApiSecurityScheme
      {
        Name = "Authorization",
        In = OpenApiSecurityApiKeyLocation.Header,
        Type = OpenApiSecuritySchemeType.ApiKey
      });
    });

    services.AddService<TokenRequirementHandler>();

    services.AddAuthentication(options =>
    {
      options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
      options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
      options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    }).AddJwtBearer();

    services.AddAuthorization(x => { x.AddPolicy(RequireAuthPolicy, builder => { builder.Requirements.Add(new TokenRequirement()); }); });

    // Add json converters here as well
    services.AddSignalR(options =>
      {
        options.EnableDetailedErrors = true;
      })
      .AddJsonProtocol(options => { JsonSerializerSettings.ConfigureOptions(options.PayloadSerializerOptions); });

    // For Resource access level
    services.AddService<MongoAccessLevelContextFactory>();

    // For services using json serialization (notifications)
    var jsonSerializerOptions = new JsonSerializerOptions();
    JsonSerializerSettings.ConfigureOptions(jsonSerializerOptions);
    services.AddSingleton(jsonSerializerOptions);

    ConfigureLianeServices(context, services);
  }

  private static Task StartCurrentModuleWeb(string[] args)
  {
    return WebHost.CreateDefaultBuilder(args)
      .ConfigureLogging(logging => { logging.ClearProviders(); })
      .UseNLog(new NLogAspNetCoreOptions { RemoveLoggerFactoryFilter = false })
      .ConfigureAppConfiguration((hostingContext, config) =>
      {
        var env = hostingContext.HostingEnvironment;

        var compositeFileProvider = new CompositeFileProvider(
          new EmbeddedFileProvider(typeof(Startup).Assembly),
          new PhysicalFileProvider(Directory.GetCurrentDirectory())
        );

        config.SetFileProvider(compositeFileProvider);
        config.AddJsonFile("default.json", true, true);
        config.AddJsonFile($"default.{env.EnvironmentName}.json", true, true);
        config.AddCommandLine(args);
        config.AddEnvironmentVariables("LIANE_");
      })
      .ConfigureServices(ConfigureServices)
      .Configure(Configure)
      .UseUrls("http://*:5000")
      .UseKestrel()
      .Build()
      .RunAsync();
  }

  private static void Configure(WebHostBuilderContext context, IApplicationBuilder app)
  {
    app.UseOpenApi();
    app.UseSwaggerUi();
    app.UseCors("AllowLocal");

    var env = context.HostingEnvironment;
    if (env.IsDevelopment())
    {
      app.UseDeveloperExceptionPage();
    }
    else
    {
      app.UseHsts();
    }

    app.UseRouting();

    app.UseCors(x => x
      .AllowAnyOrigin()
      .AllowAnyMethod()
      .AllowAnyHeader());

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseEndpoints(endpoints =>
    {
      endpoints.MapHub<ChatHub>("/api/hub");
      endpoints.MapControllers();
      endpoints.MapHealthChecks("/health");
    });

    app.ApplicationServices.GetRequiredService<IMongoDatabase>();
    var migrationService = app.ApplicationServices.GetRequiredService<MigrationService>();

    migrationService.Execute()
      .ConfigureAwait(false)
      .GetAwaiter()
      .GetResult();

    var postgisMigrationService = app.ApplicationServices.GetRequiredService<PostgisUpdateService>();
    postgisMigrationService.Execute()
      .ConfigureAwait(false)
      .GetAwaiter()
      .GetResult();

    var lianeTrackerService = app.ApplicationServices.GetRequiredService<ILianeTrackerService>();
    lianeTrackerService.SyncTrackers()
      .ConfigureAwait(false)
      .GetAwaiter()
      .GetResult();
  }
}