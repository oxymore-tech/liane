using System.Collections.Immutable;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Osrm
{
    public sealed class OsrmServiceImpl : IOsrmService
    {
        private readonly MemoryCache routeCache = new(new MemoryCacheOptions());
        private readonly HttpClient client;
        private readonly ILogger<OsrmServiceImpl> logger;

        public OsrmServiceImpl(ILogger<OsrmServiceImpl> logger, OsrmSettings settings)
        {
            client = new HttpClient {BaseAddress = settings.Url};
            this.logger = logger;
        }

        public Task<Response.Routing> Route(LatLng start, LatLng end)
        {
            var key = ImmutableList.Create(start, end);
            return routeCache.GetOrCreateAsync(key, _ => Route(key, overview: "full"));
        }

        public async Task<Response.Routing> Route(ImmutableList<LatLng> coordinates,
            string alternatives = "false",
            string steps = "false",
            string geometries = "geojson",
            string overview = "simplified",
            string annotations = "false",
            string continueStraight = "default")
        {
            string uri = $"/route/v1/driving/{Format(coordinates)}";

            var result = await client.GetFromJsonAsync<Response.Routing>(uri.WithParams(new
            {
                alternatives,
                steps,
                geometries,
                overview,
                annotations,
                continue_straight = continueStraight
            }));

            if (result == null)
            {
                throw new ResourceNotFoundException("Osrm response");
            }

            return result;
        }

        private static string Format(ImmutableList<LatLng> coordinates)
        {
            return string.Join(";", coordinates.Select(c => c.ToLngLatString()));
        }
    }
}