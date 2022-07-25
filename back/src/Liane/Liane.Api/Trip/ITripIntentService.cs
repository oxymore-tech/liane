using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Trip;

public interface ITripIntentService
{
    Task<TripIntent> Create(ReceivedTripIntent tripIntent);
    
    Task Delete(string id);
    
    Task<ImmutableList<TripIntent>> List();
}

public sealed record ReceivedTripIntent(
    RallyingPoints.RallyingPoint From, 
    RallyingPoints.RallyingPoint To, 
    string FromTime,
    string? ToTime
);