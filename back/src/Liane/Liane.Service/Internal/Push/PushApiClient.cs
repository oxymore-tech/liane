using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Liane.Service.Internal.Push;

internal sealed class PushApiClient
{
    private const string ExpoBackendHost = "https://exp.host";
    private const string PushSendPath = "/--/api/v2/push/send";

    private static readonly HttpClientHandler HttpHandler = new() {MaxConnectionsPerServer = 6};
    private static readonly HttpClient Client = new(HttpHandler);

    static PushApiClient()
    {
        Client.BaseAddress = new Uri(ExpoBackendHost);
        Client.DefaultRequestHeaders.Accept.Clear();
        Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public static async Task<PushTicketResponse> SendPushAsync(PushTicketRequest pushTicketRequest)
    {
        var ticketResponse = await PostAsync<PushTicketRequest, PushTicketResponse>(pushTicketRequest, PushSendPath);
        return ticketResponse;
    }

    private static async Task<TU> PostAsync<T, TU>(T requestObj, string path) where T : class
    {
        var serializedRequestObj = JsonConvert.SerializeObject(requestObj, new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore
        });
        var requestBody = new StringContent(serializedRequestObj, Encoding.UTF8, "application/json");
        var response = await Client.PostAsync(path, requestBody);

        if (!response.IsSuccessStatusCode)
        {
            throw new ArgumentException("");
        }

        var rawResponseBody = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<TU>(rawResponseBody);
    }
}