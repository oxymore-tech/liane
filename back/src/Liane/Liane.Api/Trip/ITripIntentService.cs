using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Trip;

public interface ITripIntentService
{
    Task<TripIntent> Create(TripIntent tripIntent);
    
    Task Delete(string id);
    
    Task<ImmutableList<TripIntent>> List();
}