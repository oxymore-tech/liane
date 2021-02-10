using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Location;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Location
{
    public sealed class LocationServiceImpl : ILocationService
    {
        private readonly ILogger<LocationServiceImpl> logger;
        private readonly ICurrentContext currentContext;

        public LocationServiceImpl(ILogger<LocationServiceImpl> logger, ICurrentContext currentContext)
        {
            this.logger = logger;
            this.currentContext = currentContext;
        }

        public Task LogLocation(ImmutableList<UserLocation> userLocations)
        {
            logger.LogInformation("Receive logs from user {CurrentUser}:\n{userLocations}", currentContext.CurrentUser(), userLocations);
            return Task.CompletedTask;
        }
    }
}