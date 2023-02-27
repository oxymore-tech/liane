using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Mock;

public interface IMockService
{
  /// <summary>
  /// Generate a set of Liane near a given from an to location 
  /// </summary>
  /// <returns>The generated User owner </returns>
  /// <param name="count">number of items to generate</param>
  /// <param name="from">Starting from location</param>
  /// <param name="to">Arrival to location</param>
  /// <param name="radius">radius (in meters)</param>
  Task<ImmutableList<Api.Trip.Liane>> GenerateLianes(int count, LatLng from, LatLng? to, int? radius);
}