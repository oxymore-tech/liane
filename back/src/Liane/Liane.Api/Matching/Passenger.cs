using System;
using Liane.Api.Routing;

namespace Liane.Api.Matching
{
    public sealed class Passenger : User
    {
        public Passenger(LatLng waypoint)
        {
            Waypoint = waypoint;
            ArrivalTime = DateTime.Today;
        }

        public LatLng Waypoint { get; }
        public DateTime ArrivalTime { get; }
    }
}