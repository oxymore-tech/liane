using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Liane.Api.Util;
using Liane.Api.Util.Startup;
using Liane.Service;
using Liane.Service.Internal;
using Liane.Service.Internal.Address;
using Liane.Service.Internal.Display;
using Liane.Service.Internal.Location;
using Liane.Service.Internal.Matching;
using Liane.Service.Internal.Notification;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Rp;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Exception;
using Liane.Web.Internal.File;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NLog;
using NLog.Config;
using NLog.Layouts;
using NLog.Targets;
using NLog.Targets.Wrappers;
using NLog.Web;
using NLog.Web.LayoutRenderers;
using NSwag;
using LogLevel = NLog.LogLevel;

namespace Liane.Web
{
    public static class Startup
    {
        private static void ConfigureLianeServices(WebHostBuilderContext context, IServiceCollection services)
        {
            services.AddService<OsrmServiceImpl>();
            services.AddService<RoutingServiceImpl>();
            services.AddService<AddressServiceNominatimImpl>();
            services.AddService<UserServiceImpl>();
            services.AddService<MatchingServiceImpl>();
            services.AddSettings<OsrmSettings>(context);
            services.AddSettings<NominatimSettings>(context);

            services.AddSettings<MongoSettings>(context);

            services.AddSettings<RedisSettings>(context);
            services.AddService<RedisClient>();

            services.AddService<CurrentContextImpl>();
            services.AddSettings<TwilioSettings>(context);
            services.AddSettings<AuthSettings>(context);
            services.AddService<AuthServiceImpl>();
            
            services.AddService<LocationServiceImpl>();
            services.AddService<TripServiceImpl>();
            services.AddService<RallyingPointServiceImpl>();
            services.AddService<NotificationServiceImpl>();
            services.AddService<RealTripServiceImpl>();
            services.AddService<RawTripServiceImpl>();
            services.AddService<LianeTripServiceImpl>();
        }

        public static void StartCurrentModule(string[] args)
        {
            var logger = ConfigureLogger();
            try
            {
                StartCurrentModuleWeb(args);
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
                        {Condition = "level <= LogLevel.Debug", ForegroundColor = ConsoleOutputColor.DarkGray},
                    new ConsoleRowHighlightingRule
                        {Condition = "level == LogLevel.Info", ForegroundColor = ConsoleOutputColor.DarkBlue},
                    new ConsoleRowHighlightingRule
                        {Condition = "level == LogLevel.Warn", ForegroundColor = ConsoleOutputColor.DarkYellow},
                    new ConsoleRowHighlightingRule
                        {Condition = "level >= LogLevel.Error", ForegroundColor = ConsoleOutputColor.Red}
                },
                Layout = Env.IsDevelopment() ? devLayout : jsonLayout
            };
            var consoleTarget = new AsyncTargetWrapper("console", coloredConsoleTarget);
            loggingConfiguration.AddTarget(consoleTarget);
            loggingConfiguration.AddRule(LogLevel.Debug, LogLevel.Fatal, consoleTarget);
            var logFactory = NLogBuilder.ConfigureNLog(loggingConfiguration);
            var logger = logFactory.GetCurrentClassLogger();
            return logger;
        }

        private static void StartCurrentModuleWeb(string[] args)
        {
            WebHost.CreateDefaultBuilder(args)
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
                        new EmbeddedFileProvider(Assembly.GetAssembly(typeof(Startup))),
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
                .UseUrls("http://*:8081")
                .UseKestrel()
                .Build()
                .Run();
        }

        private static void ConfigureServices(WebHostBuilderContext context, IServiceCollection services)
        {
            ConfigureLianeServices(context, services);
            services.AddService<FileStreamResultExecutor>();
            services.AddControllers();
            services.AddCors(options =>
                {
                    options.AddPolicy("AllowLocal",
                        p => p.WithOrigins("http://localhost:3000")
                            .AllowAnyMethod()
                            .AllowAnyHeader()
                            .AllowCredentials());

                    options.AddPolicy("AllowProd",
                        p => p.WithOrigins("https://liane.gjini.co")
                            .SetIsOriginAllowedToAllowWildcardSubdomains()
                            .AllowAnyMethod()
                            .AllowAnyHeader()
                            .AllowCredentials());
                }
            );

            services.AddMvcCore(options => { options.Filters.Add<ExceptionFilter>(); });
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
            app.UseEndpoints(endpoints => { endpoints.MapControllers(); });

            StartServicesHook(app.ApplicationServices)
                .GetAwaiter()
                .GetResult();
        }

        private static async Task StartServicesHook(IServiceProvider appApplicationServices)
        {
            foreach (var onStartup in appApplicationServices.GetServices<IOnStartup>())
            {
                await onStartup.OnStartup();
            }
        }
    }
}