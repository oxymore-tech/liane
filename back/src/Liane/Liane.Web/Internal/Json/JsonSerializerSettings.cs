using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Service.Internal.Util;

namespace Liane.Web.Internal.Json;

public static class JsonSerializerSettings
{
  private static readonly JsonConverter[] Converters =
  {
    new TimeOnlyJsonConverter(),
    new RefJsonConverterFactory(),
    new CursorJsonConverter(),
    new JsonStringEnumConverter(),
    new NotificationJsonConverter()
  };

  private static readonly JsonNamingPolicy NamingPolicy = new SnakeCaseNamingPolicy();
  
  public static void ConfigureOptions(JsonSerializerOptions options)
  {
    foreach (var converter in Converters)
    {
      options.Converters.Add(converter);
    }

    options.TypeInfoResolver = new PolymorphicTypeResolver {
     
    };
    options.PropertyNamingPolicy = NamingPolicy;
    options.PropertyNameCaseInsensitive = true;
  }
}