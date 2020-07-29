using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Matching;
using Liane.Service.Internal.Osrm;

namespace Liane.Service.Internal.Matching
{
    public class MatchingServiceImpl : IMatchingService
    {
        private readonly IOsrmService osrmService;
        public readonly IUserService UserService;

        public MatchingServiceImpl(IOsrmService osrmService, IUserService userService)
        {
            this.osrmService = osrmService;
            UserService = userService;
        }

        public async Task<ImmutableList<PassengerProposal>> SearchPassengers(string userId)
        {
            var result = ImmutableList<PassengerProposal>.Empty;
            var driver = UserService.GetDriver(userId);
            var passengers = UserService.GetAllPassengers();
            
            if (driver == null )
                return result;

            if (driver.NbOfSeat == 0)
                return result;
            
            var route = await osrmService.Route(ImmutableList.Create(driver.Start, driver.End), overview: "false");            
            foreach (var passenger in passengers)
            {
                if (passenger.HasMatch) continue;
                
                var routeWithWaypoint = await osrmService.Route(ImmutableList.Create(driver.Start, passenger.Waypoint, driver.End), overview: "false");
                Console.WriteLine($"route: {route}\nwaypointRoute: {routeWithWaypoint}");// both null ?
                var delta = route.Routes[0].Duration - routeWithWaypoint.Routes[0].Duration;
                if ( delta > driver.MaxDelta || delta < 0 ) continue;

                // TODO: Test here if arrival time < maximum Arrival Time of the Passenger
                
                
                var id = UserService.GetId(passenger);
                result.Add(new PassengerProposal(id ?? "noId found"));
            }

            return result;
        }

        public Task<ImmutableList<DriverProposal>> SearchDrivers(string userId)
        {
            return Task.FromResult(ImmutableList<DriverProposal>.Empty);
        }
    }
}