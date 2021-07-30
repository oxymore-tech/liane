using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util;
using StackExchange.Redis;

namespace Liane.Api
{
    public interface IRallyingPointService2
    {
        /**
         * Add a rallying point.
         */
        Task Add();
        
        /**
         * Delete a rallying point.
         */
        Task Delete(string id);
        
        /**
         * Move a rallying point.
         */
        Task Move(string id, LatLng pos);
        
        /**
         * Load rallying points from a file.
         */
        Task LoadFile();
        
        /**
         * List rallying points close to a point.
         */
        Task<ImmutableList<RallyingPoint2>> List(LatLng pos);
        
        /**
         * Get rallying points close to a point.
         */
        Task<List<RallyingPoint2>> GetClosest(RedisKey key, LatLng pos, double radius, GeoUnit unit);
        
        /**
         * Get the first rallying point close to a point.
         */
        Task<RallyingPoint2?> GetFirstClosest(RedisKey key, LatLng pos, double radius, GeoUnit unit);
    }
}