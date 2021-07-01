using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Trip
{
    public class LianeTripServiceImpl : ILianeTripService
    {
        public async Task Create(ImmutableHashSet<ImmutableHashSet<RallyingPoint>> rallyingPoints)
        {
            foreach (var from in rallyingPoints.Select((r, i) => new { r, i }))
            {
                foreach (var to in rallyingPoints.Skip(from.i + 1))
                {
                    
                }
            }
        }

        public async Task Delete(string lianeTripId)
        {
            
        }

        public async Task<List<Api.Trip.Liane>> Snap(LatLng center, TripFilter tripFilter)
        {
            return null;
        }
    }
}