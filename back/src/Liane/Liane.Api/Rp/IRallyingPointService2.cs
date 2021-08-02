using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util;
using StackExchange.Redis;

namespace Liane.Api.Rp
{
    public interface IRallyingPointService2
    {
        /**
         * Adds a rallying point.
         */
        Task Add(LatLng pos, string name);
        
        /**
         * Deletes a rallying point.
         */
        Task Delete(string id);
        
        /**
         * Moves a rallying point.
         */
        Task Move(string id, LatLng pos);

        /**
         * Changes the state of a rallying point.
         */
        Task ChangeState(string id, bool isActive);
        
        /**
         * Loads rallying points from a file.
         */
        Task LoadFile();
        
        /**
         * Lists rallying points close to a point.
         */
        Task<ImmutableList<RallyingPoint2>> List(LatLng pos);
        
        /**
         * Gets rallying points close to a point.
         */
        Task<ImmutableList<RallyingPoint2>> GetClosest(LatLng pos, double radius);
        
        /**
         * Gets the first rallying point close to a point.
         */
        Task<RallyingPoint2?> GetFirstClosest(LatLng pos, double radius);
    }
}