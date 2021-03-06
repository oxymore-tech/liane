using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Matching;
using Liane.Service.Internal.Osrm;

namespace Liane.Service.Internal.Matching
{
    public class MatchingServiceImpl : IMatchingService
    {
        private readonly IOsrmService osrmService;
        private readonly IUserService userService;

        public MatchingServiceImpl(IOsrmService osrmService, IUserService userService)
        {
            this.osrmService = osrmService;
            this.userService = userService;
        }

        public async Task<ImmutableList<PassengerProposal>> SearchPassengers(string userId)
        {
            var result = ImmutableList<PassengerProposal>.Empty;
            var driver = await userService.GetDriver(userId);
            var passengers = await userService.GetAllPassengers();

            if (driver.NbOfSeat == 0)
            {
                return result;
            }

            var route = await osrmService.Route(ImmutableList.Create(driver.Start, driver.End), overview: "false");
            foreach (var passenger in passengers)
            {
                if (passenger.HasMatch)
                {
                    continue;
                }

                Osrm.Response.Routing routeWithWaypoint;
                if (passenger.End.Equals(driver.End))
                {
                    routeWithWaypoint = await osrmService.Route(ImmutableList.Create(driver.Start, passenger.Start, driver.End), overview: "false");
                }
                else
                {
                    routeWithWaypoint = await osrmService.Route(ImmutableList.Create(driver.Start, passenger.Start, passenger.End, driver.End), overview: "false");
                }

                var delta = routeWithWaypoint.Routes[0].Duration - route.Routes[0].Duration;
                if (delta > driver.MaxDelta || delta < 0)
                {
                    continue;
                }

                var currentArrivalTime = driver.DepartureTime.AddSeconds(routeWithWaypoint.Routes[0].Duration);
                if (currentArrivalTime > passenger.MaxArrivalTime)
                {
                    continue;
                }

                var id = await userService.GetId(passenger);
                result = result.Add(new PassengerProposal(id ?? "noId found"));
            }

            return result;
        }

        public Task<ImmutableList<DriverProposal>> SearchDrivers(string userId)
        {
            return Task.FromResult(ImmutableList<DriverProposal>.Empty);
        }
    }
}