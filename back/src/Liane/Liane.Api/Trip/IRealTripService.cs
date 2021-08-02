using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Trip
{
    public interface IRealTripService
    {
        Task Save(ImmutableHashSet<RealTrip> trips);

        Task<ImmutableHashSet<RealTrip>> List();
    }
}