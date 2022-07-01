using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.TripIntent;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.TripIntent;

public class TripIntentServiceImpl : ITripIntentService
{
    private readonly ILogger<TripIntentServiceImpl> logger;
    private readonly ICurrentContext currentContext;
    
    public TripIntentServiceImpl(ILogger<TripIntentServiceImpl> logger, ICurrentContext currentContext)
    {
        this.logger = logger;
        this.currentContext = currentContext;
    }
    
    public Task<Api.TripIntent.TripIntent> Create(Api.TripIntent.TripIntent tripIntent)
    {
        logger.LogInformation("Created trip from {0} to {1}", tripIntent.from.Label, tripIntent.to.Label);
        throw new System.NotImplementedException();
    }

    public Task Delete(string id)
    {
        throw new System.NotImplementedException();
    }

    public Task<ImmutableList<Api.TripIntent.TripIntent>> List()
    {
        throw new System.NotImplementedException();
    }
}