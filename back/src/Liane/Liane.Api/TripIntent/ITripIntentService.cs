using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.TripIntent;

public interface ITripIntentService
{
    Task<TripIntent> Create(TripIntent tripIntent);
    
    Task Delete(string id);
    
    Task<ImmutableList<TripIntent>> List();
}