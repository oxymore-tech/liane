using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Osrm.Response;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;

namespace Liane.Service.Internal.Osrm;

public sealed class OsrmClient : IOsrmService
{
  private static readonly JsonSerializerOptions JsonOptions = new()
  {
    PropertyNamingPolicy = new SnakeCaseNamingPolicy(),
    PropertyNameCaseInsensitive = true,
    Converters = { new LngLatTupleJsonConverter() }
  };

  private readonly MemoryCache routeCache = new(new MemoryCacheOptions { SizeLimit = 50 });
  private readonly HttpClient client;

  public OsrmClient(OsrmSettings settings)
  {
    client = new HttpClient { BaseAddress = settings.Url };
  }

  public Task<Response.Routing> Route(IEnumerable<LatLng> coordinates, string alternatives = "false", string steps = "false", string geometries = "geojson", string overview = "simplified",
    string annotations = "false",
    string continueStraight = "default")
  {
    var format = Format(coordinates);

    if (format.IsNullOrEmpty())
    {
      return Task.FromResult(new Response.Routing("Ok", ImmutableList<Waypoint>.Empty, ImmutableList<Route>.Empty));
    }

    var uri = $"/route/v1/driving/{format}";

    var url = uri.WithParams(new
    {
      alternatives,
      steps,
      geometries,
      overview,
      annotations,
      continue_straight = continueStraight
    });

    return routeCache.GetOrCreateAsync(url, e =>
    {
      e.Size = 1;
      return GetRouteInternal(url);
    })!;
  }

  public async Task<Response.Trip> Trip(IEnumerable<LatLng> coordinates, string roundtrip = "false", string source = "first", string destination = "last", string geometries = "geojson",
    string overview = "false",
    string annotations = "false", string steps = "false")
  {
    var format = Format(coordinates);

    if (format.IsNullOrEmpty())
    {
      return new Response.Trip("Ok", ImmutableList<TripWaypoint>.Empty, ImmutableList<Route>.Empty);
    }

    var uri = $"/trip/v1/driving/{format}";

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

  public async Task<Table> Table(IEnumerable<LatLng> coordinates)
  {
    var uri = $"/table/v1/driving/{Format(coordinates)}?annotations=duration,distance";
    var result = await client.GetFromJsonAsync<Table>(uri, JsonOptions);
    if (result == null)
    {
      throw new ResourceNotFoundException("Osrm response");
    }

    return result;
  }

  public async Task<LatLng?> Nearest(LatLng coordinate, int number = 1, int? radius = null)
  {
    var uri = $"/nearest/v1/driving/{coordinate.ToString()}?number={number}";
    var result = await client.GetFromJsonAsync<Nearest>(uri, JsonOptions);
    if (result == null)
    {
      throw new ResourceNotFoundException("Osrm response");
    }

    if (result.Code == "Ok" && (radius == null || result.Waypoints[0].Distance <= radius))
    {
      return result.Waypoints[0].Location;
    }

    return null;
  }

  private static string Format(IEnumerable<LatLng> coordinates)
  {
    return string.Join(";", coordinates.Select(c => c.ToString()));
  }

  private async Task<Response.Routing> GetRouteInternal(string url)
  {
    var result = await client.GetFromJsonAsync<Response.Routing>(url, JsonOptions);

    if (result == null)
    {
      throw new ResourceNotFoundException("Osrm response");
    }

    return result;
  }
}