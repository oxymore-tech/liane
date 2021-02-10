using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Display
{
    public interface IDisplayService
    {

        Task<ImmutableList<Trip>> DisplayTrips(DisplayQuery displayQuery);
        Task<LabeledPosition> SnapPosition(LatLng latLng);
    }
}