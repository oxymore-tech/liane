using System;
using System.Collections;
using System.Globalization;
using System.Web;

namespace Liane.Api.Util.Http;

public static class UriExtensions
{
    public static string WithParams(this string uri, object? parameters = null)
    {
        return CreateUri(uri, parameters);
    }

    public static string CreateUri(string uri, object? parameters = null)
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

            if (value == null)
            {
                continue;
            }

            if (value is ICollection e)
            {
                foreach (var item in e)
                {
                    if (item != null)
                    {
                        queryString.Add(propertyInfo.Name, Convert.ToString(item, CultureInfo.InvariantCulture));
                    }
                }
            }
            else if (value is DateTime d)
            {
                queryString.Add(propertyInfo.Name, d.ToUniversalTime().ToString("o"));
            }
            else
            {
                queryString.Add(propertyInfo.Name, Convert.ToString(value, CultureInfo.InvariantCulture));
            }
        }

        return $"{uri}?{queryString}";
    }
}