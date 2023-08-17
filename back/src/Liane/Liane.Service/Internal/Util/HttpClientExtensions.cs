using System;
using System.Collections;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;
using Liane.Api.Util;
using Liane.Api.Util.Exception;

namespace Liane.Service.Internal.Util;

public static class HttpClientExtensions
{
  public static async Task<T> PostAsyncAs<T>(this HttpClient client, string uri, HttpContent? content = null, object? parameters = null, JsonSerializerOptions? options = null)
  {
    var response = await client.PostAsync(CreateUri(uri, parameters), content);
    return await CheckAndReadResponseAs<T>(response, options);
  }

  private static string CreateUri(string uri, object? parameters = null)
  {
    if (parameters == null)
    {
      return uri;
    }

    var properties = parameters.GetType().GetProperties();
    if (properties.Length == 0)
    {
      return uri;
    }

    var queryString = HttpUtility.ParseQueryString(string.Empty);
    foreach (var propertyInfo in properties)
    {
      var value = propertyInfo.GetValue(parameters);

      var propertyName = propertyInfo.Name.Uncapitalize();

      switch (value)
      {
        case null:
          continue;
        case ICollection e:
        {
          foreach (var item in e)
          {
            if (item != null)
            {
              queryString.Add(propertyName, Convert.ToString(item, CultureInfo.InvariantCulture));
            }
          }

          break;
        }
        case DateTime d:
          queryString.Add(propertyName, d.ToUniversalTime().ToString("o"));
          break;
        default:
          queryString.Add(propertyName, Convert.ToString(value, CultureInfo.InvariantCulture));
          break;
      }
    }

    var s = queryString.ToString()!;
    return s.Length == 0 ? uri : $"{uri}?{s}";
  }

  public static async Task<T> CheckAndReadResponseAs<T>(this HttpResponseMessage response, JsonSerializerOptions? options = null)
  {
    await CheckResponse(response);
    return (await JsonSerializer.DeserializeAsync<T>(await response.Content.ReadAsStreamAsync(), options))!;
  }

  public static async Task CheckResponse(this HttpResponseMessage response)
  {
    if (response.StatusCode != HttpStatusCode.OK && response.StatusCode != HttpStatusCode.NoContent)
    {
      var content = await response.Content.ReadAsStringAsync();
      throw HttpExceptionMapping.Map(response.StatusCode, content);
    }
  }
}