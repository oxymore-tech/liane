using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Rp
{
    public interface IRallyingPointService
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
        Task<ImmutableList<RallyingPoint>> List(LatLng pos);
        
        /**
         * Gets rallying points close to a point.
         */
        Task<ImmutableList<RallyingPoint>> GetClosest(LatLng pos, double radius);
        
        /**
         * Gets the first rallying point close to a point.
         */
        Task<RallyingPoint?> GetFirstClosest(LatLng pos, double radius);
    }
}