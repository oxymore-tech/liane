using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.TripIntent;

public interface ITripIntentService
{
    Task<TripIntent> Create(ReceivedTripIntent tripIntent);
    
    Task Delete(string id);
    
    Task<ImmutableList<TripIntent>> ListAll();

    Task<ImmutableList<TripIntent>> List();
}

public sealed record ReceivedTripIntent(
    RallyingPoint.RallyingPoint From, 
    RallyingPoint.RallyingPoint To, 
    string FromTime,
    string? ToTime 
);