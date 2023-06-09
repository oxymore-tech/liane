using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Osrm;

public interface IOsrmService
{
  /// <summary>
  /// Find the fastest route between coordinates in the supplied order.
  /// See parameters doc at : https://project-osrm.org/docs/v5.24.0/api/#route-service
  /// </summary>
  Task<Response.Routing> Route(IEnumerable<LatLng> coordinates,
    string alternatives = "false",
    string steps = "false",
    string geometries = "geojson",
    string overview = "simplified",
    string annotations = "false",
    string continueStraight = "default",
    CancellationToken cancellationToken = default);

  /// <summary>
  /// Sort a list of WayPoints (Traveling Salesman Problem).
  /// See parameters doc at : https://project-osrm.org/docs/v5.24.0/api/#trip-service
  /// </summary>
  /// <returns>A list of WayPoints</returns>
  Task<Response.Trip> Trip(IEnumerable<LatLng> coordinates,
    string roundtrip = "false",
    string source = "first",
    string destination = "last",
    string geometries = "geojson",
    string overview = "false",
    string annotations = "false",
    string steps = "false",
    CancellationToken cancellationToken = default);

  Task<Response.Table> Table(IEnumerable<LatLng> coordinates, CancellationToken cancellationToken = default);

  Task<LatLng?> Nearest(LatLng coordinate, int number = 1, int? radius = null, CancellationToken cancellationToken = default);
}