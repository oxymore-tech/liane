using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using StackExchange.Redis;

namespace Liane.Api.Rp
{
    public interface IRallyingPointService
    {
        Task<RallyingPoint> Get(string id);
        
        Task<RallyingPoint?> TrySnap(LatLng position);
        
        Task<RallyingPoint> Snap(LatLng position);
        
        Task<ImmutableList<RallyingPoint>> List(LatLng center);

        Task<List<GeoRadiusResult>> GetClosest(RedisKey key, double lng, double lat, double radius, GeoUnit unit);
        
        Task<GeoRadiusResult?> GetOneClosest(RedisKey key, double lng, double lat, double radius, GeoUnit unit);

    }
}