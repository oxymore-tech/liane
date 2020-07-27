using System;
using Liane.Api.Routing;

namespace Liane.Api.Matching
{
    public sealed class Passenger
    {
        public Passenger(Travel travel, DateTime maxArrivalTime, LatLng waypoint)
        {
            Travel = travel;
            MaxArrivalTime = maxArrivalTime;
            Waypoint = waypoint;
        }

        public Travel Travel { get; }
        public DateTime MaxArrivalTime { get; }
        public LatLng Waypoint { get; }
        
    }
}