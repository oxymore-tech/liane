using System;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using Liane.Api.Event;
using Liane.Api.Util;
using Liane.Service.Internal.Event;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Liane.Web.Internal.Startup;

public static class DependencyInjectionExtensions
{
  private static readonly Regex SettingsPattern = new("(.*)Settings");

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

  public static IServiceCollection AddEventListeners(this IServiceCollection services)
  {
    foreach (var eventListener in Assembly.GetAssembly(typeof(EventDispatcher))!
               .GetTypes()
               .Where(t => t is { IsClass: true, IsAbstract: false } && t.IsAssignableTo(typeof(IEventListener))))
    {
      services.AddService(eventListener);
    }

    services.AddService<EventDispatcher>();
    return services;
  }

  public static IServiceCollection AddService<T>(this IServiceCollection services)
  {
    var type = typeof(T);
    return services.AddService(type);
  }

  public static IServiceCollection AddService(this IServiceCollection services, Type type)
  {
    services.AddSingleton(type);
    foreach (var i in type.GetInterfaces())
    {
      services.AddSingleton(i, provider => provider.GetService(type)!);
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
    {
      throw new ArgumentException($"Settings type name {name} is malformed. Must be 'SectionSettings'");
    }

    var key = match.Groups[1].Value;
    var section = context.Configuration.GetSection(key);
    var constructorInfo = typeof(T)
      .GetConstructors()[0];
    var parameters = constructorInfo
      .GetParameters()
      .Select(p =>
      {
        var value = section.GetValue(p.ParameterType, p.Name!, null);
        if (value == null && !p.IsNullable())
        {
          throw new ArgumentException($"Missing required configuration key '{key}.{p.Name}'. Required in settings {typeof(T)}");
        }

        return value;
      })
      .ToArray();
    var settings = (T)constructorInfo.Invoke(parameters);
    services.AddSingleton(settings);
    return services;
  }
}