using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Caching.Memory;

namespace Liane.Service.Internal.Osrm;

public sealed class OsrmClient : IOsrmService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
        { PropertyNamingPolicy = new SnakeCaseNamingPolicy(), PropertyNameCaseInsensitive = true, Converters = { new LngLatTupleJsonConverter() } };

    private readonly MemoryCache routeCache = new(new MemoryCacheOptions());
    private readonly HttpClient client;

    public OsrmClient(OsrmSettings settings)
    {
        client = new HttpClient { BaseAddress = settings.Url };
    }

    /*
    public Task<Response.Routing> Route(LatLng start, LatLng end)
    {
        var key = ImmutableList.Create(start, end);
        return routeCache.GetOrCreateAsync(key, _ => Route(key, overview: "full"));
    }
*/

    private static string Format(IEnumerable<LatLng> coordinates)
    {
        return string.Join(";", coordinates.Select(c => c.ToString()));
    }

    public async Task<Response.Routing> Route(IEnumerable<LatLng> coordinates, string alternatives = "false", string steps = "false", string geometries = "geojson", string overview = "simplified", string annotations = "false",
        string continueStraight = "default")
    {
        var uri = $"/route/v1/driving/{Format(coordinates)}";

        var result = await client.GetFromJsonAsync<Response.Routing>(uri.WithParams(new
        {
            alternatives,
            steps,
            geometries,
            overview,
            annotations,
            continue_straight = continueStraight
        }), JsonOptions);

        if (result == null)
        {
            throw new ResourceNotFoundException("Osrm response");
        }

        return result;
    }

    public async Task<Response.Trip> Trip(IEnumerable<LatLng> coordinates, string roundtrip = "false", string source = "first", string destination = "last", string geometries = "geojson", string overview = "false",
        string annotations = "false", string steps = "false")
    {
        var uri = $"/trip/v1/driving/{Format(coordinates)}";

        var result = await client.GetFromJsonAsync<Response.Trip>(uri.WithParams(new
        {
            roundtrip,
            source,
            destination,
            steps,
            geometries,
            overview,
            annotations
        }), JsonOptions);

        if (result == null)
        {
            throw new ResourceNotFoundException("Osrm response");
        }

        return result;
    }

    public async Task<Response.Table> Table(IEnumerable<LatLng> coordinates)
    {
      // TODO check if we'll use distance matrix 
      var uri = $"/table/v1/driving/{Format(coordinates)}?annotations=duration,distance";
      var result = await client.GetFromJsonAsync<Response.Table>(uri);
      if (result == null)
      {
        throw new ResourceNotFoundException("Osrm response");
      }

      return result;
    }
}