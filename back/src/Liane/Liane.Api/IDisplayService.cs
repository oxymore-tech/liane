using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api
{
    public interface IDisplayService
    {

        Task<ImmutableList<Trip>> DisplayTrips();
    }
}