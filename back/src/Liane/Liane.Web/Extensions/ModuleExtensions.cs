using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Liane.Api.Util;
using Liane.Api.Util.Startup;
using Liane.Service.Internal;
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
using Microsoft.OpenApi.Models;
using NLog;
using NLog.Config;
using NLog.Layouts;
using NLog.Targets;
using NLog.Targets.Wrappers;
using NLog.Web;
using NLog.Web.LayoutRenderers;
using LogLevel = NLog.LogLevel;

namespace Liane.Web.Extensions
{
    public static class ModuleExtensions
    {
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
                (logEventInfo, httpContext, lc) => MappedDiagnosticsLogicalContext.GetObject("TraceId"));
            AspNetLayoutRendererBase.Register("span_id",
                (logEventInfo, httpContext, lc) => MappedDiagnosticsLogicalContext.GetObject("SpanId"));
            //AspNetLayoutRendererBase.Register("user_id", (logEventInfo, httpContext, lc) => httpContext.GetUser()?.Id);
            AspNetLayoutRendererBase.Register("request_path",
                (logEventInfo, httpContext, lc) => MappedDiagnosticsLogicalContext.GetObject("RequestPath"));

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
                        new EmbeddedFileProvider(Assembly.GetAssembly(typeof(ModuleExtensions))),
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
                .UseKestrel((context, options) => { options.AllowSynchronousIO = true; })
                .Build()
                .Run();
        }

        private static void ConfigureServices(WebHostBuilderContext context, IServiceCollection services)
        {
            services.AddService<OsrmServiceImpl>();
            services.AddService<FileStreamResultExecutor>();
            services.AddControllers().AddNewtonsoftJson();
            services.AddCors(options =>
                {
                    options.AddPolicy("AllowLocal",
                        p => p.WithOrigins("http://localhost:3000")
                            .AllowAnyMethod()
                            .AllowAnyHeader()
                            .AllowCredentials());

                    options.AddPolicy("AllowProd",
                        p => p.WithOrigins("https://*.liane.fr")
                            .SetIsOriginAllowedToAllowWildcardSubdomains()
                            .AllowAnyMethod()
                            .AllowAnyHeader()
                            .AllowCredentials());
                }
            );

            services.AddMvcCore(options => { options.Filters.Add<ExceptionFilter>(); });
            services.AddService<HttpContextAccessor>();

            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("Liane", new OpenApiInfo
                {
                    Title = "Liane API", Version = Assembly.GetExecutingAssembly()
                        .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
                        ?.InformationalVersion
                });
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
                    In = ParameterLocation.Header,
                    Name = "Authorization",
                    Type = SecuritySchemeType.ApiKey
                });
            });
        }

        private static void Configure(WebHostBuilderContext context, IApplicationBuilder app)
        {
            app.UseCors("AllowLocal");

            var env = context.HostingEnvironment;
            if (env.IsDevelopment())
                app.UseDeveloperExceptionPage();
            else
                app.UseHsts();

            app.UseRouting();
            app.UseEndpoints(endpoints => { endpoints.MapControllers(); });
            app.UseSwagger();
            app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/liane/swagger.json", "Synergee Liane API"); });

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