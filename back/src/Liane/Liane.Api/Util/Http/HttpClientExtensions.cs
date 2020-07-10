using System;
using System.Collections;
using System.Net;
using System.Net.Http;
using System.Net.Http.Formatting;
using System.Threading.Tasks;
using System.Web;
using Liane.Api.Util.Exception;

namespace Liane.Api.Util.Http
{
    public static class HttpClientExtensions
    {
        public static async Task<HttpResponseMessage> GetAsync(this HttpClient client, string uri, object? parameters = null)
        {
            var response = await client.GetAsync(CreateUri(uri, parameters));
            await CheckResponse(response);
            return response;
        }

        public static async Task<T> GetAsyncAs<T>(this HttpClient client, string uri, object? parameters = null)
        {
            var response = await client.GetAsync(CreateUri(uri, parameters));
            return await CheckAndReadResponseAs<T>(response);
        }

        public static async Task<string> PostAsyncAsString(this HttpClient client, string uri, object body, object? parameters = null)
        {
            var response = await client.PostAsJsonAsync(CreateUri(uri, parameters), body);
            await CheckResponse(response);
            return await response.Content.ReadAsStringAsync();
        }

        public static async Task PostAsync(this HttpClient client, string uri, object body, object? parameters = null)
        {
            var response = await client.PostAsJsonAsync(CreateUri(uri, parameters), body);
            await CheckResponse(response);
        }

        public static async Task<T> PostAsyncAs<T>(this HttpClient client, string uri, object body, object? parameters = null)
        {
            var response = await client.PostAsJsonAsync(CreateUri(uri, parameters), body);
            return await CheckAndReadResponseAs<T>(response);
        }

        public static async Task<T> PostAsyncAs<T>(this HttpClient client, string uri, HttpContent body, object? parameters = null)
        {
            var response = await client.PostAsync(CreateUri(uri, parameters), body);
            return await CheckAndReadResponseAs<T>(response);
        }

        public static async Task DeleteAsync(this HttpClient client, string uri, object? parameters = null)
        {
            var response = await client.DeleteAsync(CreateUri(uri, parameters));
            await CheckResponse(response);
        }

        public static async Task PutAsync(this HttpClient client, string uri, object body, object? parameters = null)
        {
            var response = await client.PutAsJsonAsync(CreateUri(uri, parameters), body);
            await CheckResponse(response);
        }

        public static async Task<T> PutAsyncAs<T>(this HttpClient client, string uri, object? body, object? parameters = null)
        {
            var response = await client.PutAsJsonAsync(CreateUri(uri, parameters), body);
            return await CheckAndReadResponseAs<T>(response);
        }

        public static async Task<T> PatchAsyncAs<T>(this HttpClient client, string uri, object body, object? parameters = null)
        {
            var response = await client.PatchAsync(CreateUri(uri, parameters),
                new ObjectContent(body.GetType(), body, new JsonMediaTypeFormatter()));
            return await CheckAndReadResponseAs<T>(response);
        }

        private static async Task CheckResponse(HttpResponseMessage response)
        {
            if (response.StatusCode != HttpStatusCode.OK && response.StatusCode != HttpStatusCode.NoContent)
            {
                var content = await response.Content.ReadAsStringAsync();
                throw HttpExceptionMapping.Map(response.StatusCode, content);
            }
        }

        private static async Task<T> CheckAndReadResponseAs<T>(HttpResponseMessage response)
        {
            await CheckResponse(response);
            return await response.Content.ReadAsAsync<T>();
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
                            queryString.Add(propertyInfo.Name, item.ToString());
                        }
                    }
                }
                else if (value is DateTime d)
                {
                    queryString.Add(propertyInfo.Name, d.ToUniversalTime().ToString("o"));
                }
                else
                {
                    queryString.Add(propertyInfo.Name, value.ToString());
                }
            }

            return $"{uri}?{queryString}";
        }
    }
}