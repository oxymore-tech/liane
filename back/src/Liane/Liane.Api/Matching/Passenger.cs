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
            HasMatch = false;
        }

        public LatLng Waypoint { get; }
        public DateTime ArrivalTime { get; }
        public bool HasMatch { get; }
    }
}