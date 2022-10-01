using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Match;

public interface IIntentMatchingService
{
    public Task<ImmutableList<TripIntentMatch>> Match();
}