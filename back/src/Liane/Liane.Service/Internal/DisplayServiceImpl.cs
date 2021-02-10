using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Display;
using Liane.Api.Routing;

namespace Liane.Service.Internal
{
    public class DisplayServiceImpl : IDisplayService
    {
        public Task<ImmutableList<Trip>> DisplayTrips(DisplayQuery displayQuery)
        {
            return Task.FromResult(ImmutableList<Trip>.Empty);
        }

        public Task<LabeledPosition> SnapPosition(LatLng latLng)
        {
            throw new System.NotImplementedException();
        }
    }
}