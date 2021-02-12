using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Trip
{
    public interface ITripService
    {
        Task<IImmutableSet<Trip>> List();
    }
}