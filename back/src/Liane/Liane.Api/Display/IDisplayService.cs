using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Display
{
    public interface IDisplayService
    {

        Task<ImmutableList<Trip>> DisplayTrips(DisplayQuery displayQuery);
    }
}