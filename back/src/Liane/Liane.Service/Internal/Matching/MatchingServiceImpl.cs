using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Matching;
using Liane.Api.Routing;
using Liane.Api.Util;
using Microsoft.AspNetCore.Routing;

namespace Liane.Service.Internal.Matching
{
    public class MatchingServiceImpl : IMatchingService
    {
        private readonly IRoutingService routingService;

        public MatchingServiceImpl(IRoutingService routingService)
        {
            this.routingService = routingService;
        }

        public async Task<ImmutableList<PassengerProposal>> SearchPassengers(string userId)
        {
            Dictionary<string, Driver> drivers = Driver.GetDrivers();
            drivers.TryGetValue(userId, out var driver);
            
            Dictionary<string, Passenger> passengers = Passenger.GetPassengers();

            var result = ImmutableList<PassengerProposal>.Empty;
            if (driver == null)
            {
                return result;
            }
            
            foreach (var (id, passenger) in passengers)
            {
                DeltaRoute route = await routingService.CrossAWayPoint(new RoutingWithPointQuery(driver.Start, driver.End, passenger.Waypoint));
                if (route.Delta < driver.MaxDelta && route.Delta > -1)
                {
                    result.Add(new PassengerProposal(id));
                }
            }

            return result;
        }

        public Task<ImmutableList<DriverProposal>> SearchDrivers(string userId)
        {
            return Task.FromResult(ImmutableList<DriverProposal>.Empty);
        }
    }
}