using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Osrm.Response;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Caching.Memory;

namespace Liane.Service.Internal.Osrm;

public sealed class OsrmClient(OsrmSettings settings) : IOsrmService
{
  private static readonly JsonSerializerOptions JsonOptions = new()
  {
    PropertyNamingPolicy = new SnakeCaseNamingPolicy(),
    PropertyNameCaseInsensitive = true,
    Converters = { new LngLatTupleJsonConverter() }
  };

  private readonly MemoryCache routeCache = new(new MemoryCacheOptions { SizeLimit = 50 });
  private readonly HttpClient client = new() { BaseAddress = settings.Url };

  public Task<Response.Routing> Route(IEnumerable<LatLng> coordinates, string alternatives = "false", string steps = "false", string geometries = "geojson", string overview = "simplified",
    string annotations = "false",
    string continueStraight = "default", CancellationToken cancellationToken = default)
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
      return GetRouteInternal(url, cancellationToken);
    })!;
  }

  public async Task<Response.Trip> Trip(IEnumerable<LatLng> coordinates, CancellationToken cancellationToken = default)
  {
    var format = Format(coordinates);

    if (format.IsNullOrEmpty())
    {
      return new Response.Trip("Ok", ImmutableList<TripWaypoint>.Empty, ImmutableList<Route>.Empty);
    }

    var uri = $"/trip/v1/driving/{format}";

    var result = await client.GetFromJsonAsync<Response.Trip>(uri.WithParams(new { geometries = "geojson", source = "first", destination = "last", roundtrip = "false" }), JsonOptions, cancellationToken: cancellationToken);

    if (result == null)
    {
      throw new ResourceNotFoundException("Osrm response");
    }

    return result;
  }

  public async Task<Table> Table(IEnumerable<LatLng> coordinates, CancellationToken cancellationToken = default)
  {
    var uri = $"/table/v1/driving/{Format(coordinates)}?annotations=duration,distance";
    var result = await client.GetFromJsonAsync<Table>(uri, JsonOptions, cancellationToken: cancellationToken);
    if (result == null)
    {
      throw new ResourceNotFoundException("Osrm response");
    }

    return result;
  }

  public async Task<LatLng?> Nearest(LatLng coordinate, int number = 1, int? radius = null, CancellationToken cancellationToken = default)
  {
    var uri = $"/nearest/v1/driving/{coordinate.ToString()}?number={number}";
    var result = await client.GetFromJsonAsync<Nearest>(uri, JsonOptions, cancellationToken: cancellationToken);
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

  private async Task<Response.Routing> GetRouteInternal(string url, CancellationToken cancellationToken = default)
  {
    var result = await client.GetFromJsonAsync<Response.Routing>(url, JsonOptions, cancellationToken: cancellationToken);

    if (result == null)
    {
      throw new ResourceNotFoundException("Osrm response");
    }

    return result;
  }
}