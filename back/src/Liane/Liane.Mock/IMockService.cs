using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.User;

namespace Liane.Mock;

public interface IMockService
{
  /// <summary>
  /// Generate a set of Liane near a given location 
  /// </summary>
  
  /// <returns>the generated User owner </returns>
  /// <param name="count">number of items to generate</param>
  /// <param name="pos">center location</param>
  /// <param name="radius">radius (in meters)</param>
  Task<User> GenerateLiane(int count, LatLng pos, int? radius);
}