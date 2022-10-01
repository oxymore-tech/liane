using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Grouping;

public interface IIntentMatchingService
{
    public Task<ImmutableList<TripIntentMatch>> Matches();
}