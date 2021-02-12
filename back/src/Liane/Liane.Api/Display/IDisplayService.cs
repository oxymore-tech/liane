using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Display
{
    public interface IDisplayService
    {
        Task<ImmutableList<Trip.Trip>> DisplayTrips(DisplayQuery displayQuery);
        Task<ImmutableList<LabeledPosition>> SnapPosition(LatLng latLng);
        Task<ImmutableList<LabeledPosition>> ListDestinationsFrom(LabeledPosition labeledPosition);
        Task<ImmutableList<Trip.Trip>> ListTripsFrom(LabeledPosition labeledPosition);
        Task<IImmutableSet<Position>> ListDestinationsFrom(ImmutableList<Trip.Trip> trips);
    }
}