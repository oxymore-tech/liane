using System;
using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api.Image;
using Liane.Api.Util;
using Liane.Mock;
using Liane.Service.Internal.Address;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Image;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Mongo.Migration;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Trip.Event;
using Liane.Service.Internal.User;
using Liane.Service.Internal.Util;
using Liane.Web.Binder;
using Liane.Web.Hubs;
using Liane.Web.Internal.Auth;
using Liane.Web.Internal.Debug;
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
    services.AddSettings<TwilioSettings>(context);
    services.AddSettings<AuthSettings>(context);
    services.AddService<AuthServiceImpl>();
    services.AddService<UserServiceImpl>();
    services.AddService<HubServiceImpl>();

    services.AddService<RallyingPointServiceImpl>();
    services.AddService<ChatServiceImpl>();
    services.AddService<LianeServiceImpl>();

    services.AddService<PushServiceImpl>();
    services.AddService<NotificationServiceImpl>();

    services.AddSettings<FirebaseSettings>(context);
    services.AddService<FirebaseMessagingImpl>();

    services.AddEventListeners();
    services.AddService<AutomaticAnswerService>();

    services.AddSingleton(MongoFactory.Create);

    services.AddService<MockServiceImpl>();

    services.AddHostedService<LianeMockGenerator>();
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

    AspNetLayoutRendererBase.Register("trace_id",
      (_, _, _) => MappedDiagnosticsLogicalContext.GetObject("TraceId"));
    AspNetLayoutRendererBase.Register("span_id",
      (_, _, _) => MappedDiagnosticsLogicalContext.GetObject("SpanId"));
    AspNetLayoutRendererBase.Register("user_id", (_, httpContext, _) => httpContext.User.Identity?.Name);
    AspNetLayoutRendererBase.Register("request_path",
      (_, _, _) => MappedDiagnosticsLogicalContext.GetObject("RequestPath"));

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
    loggingConfiguration.AddRule(LogLevel.Debug, LogLevel.Fatal, consoleTarget);
    var logFactory = NLogBuilder.ConfigureNLog(loggingConfiguration);
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
          p => p.WithOrigins("http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
      }
    );

    services.AddControllers(options =>
    {
      options.Filters.Add<RequestLoggerFilter>();
      options.Filters.Add<ExceptionFilter>();
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
    services.AddSignalR()
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
      .ConfigureLogging(logging =>
      {
        logging.ClearProviders();
        logging.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Trace);
      })
      .UseNLog()
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
        config.AddJsonFile("appsettings.json", true, true);
        config.AddJsonFile($"appsettings.{env.EnvironmentName}.json", true, true);
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
    app.UseSwaggerUi3();
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
  }
}