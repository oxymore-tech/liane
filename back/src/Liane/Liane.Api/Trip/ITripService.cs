using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Display;

namespace Liane.Api.Trip
{
    public interface ITripService
    {
        Task<ImmutableHashSet<Trip>> List();

        Task<RallyingPoint?> GetRallyingPoint(string id);
    }
}