using System;
using System.Collections.Immutable;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Liane.Api.Util.Startup
{
    public static class DependencyInjectionExtensions
    {
        private static readonly Regex SettingsPattern = new Regex("(.*)Settings");

        public static IServiceCollection AddService<T>(this IServiceCollection services, T t)
            where T : class
        {
            var type = typeof(T);

            services.AddSingleton(t);
            foreach (var i in type.GetInterfaces())
            {
                services.AddSingleton(i, provider => provider.GetService<T>()!);
            }

            return services;
        }

        public static IServiceCollection AddService<T>(this IServiceCollection services)
        {
            var type = typeof(T);

            services.AddSingleton(type);
            foreach (var i in type.GetInterfaces())
            {
                services.AddSingleton(i, provider => provider.GetService<T>()!);
            }

            return services;
        }

        public static IServiceCollection AddSettings<T>(this IServiceCollection services, WebHostBuilderContext context)
            where T : class
        {
            var type = typeof(T);
            var name = type.Name;

            var match = SettingsPattern.Match(name);
            if (!match.Success)
                throw new ArgumentException($"Settings type name {name} is malformed. Must be 'SectionSettings'");

            var key = match.Groups[1].Value;
            var section = context.Configuration.GetSection(key);
            var settings = section.ToObject<T>();
            var missingConfigurationProperties = type.GetProperties()
                .Where(p =>
                {
                    var value = p.GetValue(settings);
                    if (value == null)
                        if (!p.IsNullable())
                            return true;

                    return false;
                })
                .Select(p => p.Name)
                .ToImmutableHashSet();
            if (missingConfigurationProperties.Count > 0)
                throw new ArgumentException(
                    $"Missing configuration in section '{key}' : {string.Join(",", missingConfigurationProperties)}");

            services.AddService(settings);
            return services;
        }
    }
}