using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Location;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Location;

public sealed class LocationServiceImpl : ILocationService
{
    private readonly ILogger<LocationServiceImpl> logger;
    private readonly ICurrentContext currentContext;
    private readonly IRawTripService rawTripService;
    private readonly ILianeTripService lianeTripService;

    public LocationServiceImpl(
        ILogger<LocationServiceImpl> logger, ICurrentContext currentContext, IRawTripService rawTripService, ILianeTripService lianeTripService
    )
    {
        this.logger = logger;
        this.currentContext = currentContext;
        this.rawTripService = rawTripService;
        this.lianeTripService = lianeTripService;
    }

    public async Task LogLocation(ImmutableList<UserLocation> userLocations)
    {
        logger.LogInformation("Log locations (creating raw trip and liane) : " + userLocations);

        // Save the raw data as a trip
        await rawTripService.Save(ImmutableList.Create(new RawTrip(userLocations, null)));
                
        // Save the data as a liane
        await lianeTripService.Create(currentContext.CurrentUser(), userLocations);
    }
}