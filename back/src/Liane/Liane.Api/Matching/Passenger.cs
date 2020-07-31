using System;
using Liane.Api.Routing;

namespace Liane.Api.Matching
{
    public sealed class Passenger : User
    {
        public Passenger(LatLng start, LatLng end, DateTime maxArrivalTime)
        {
            Start = start;
            End = end;
            MaxArrivalTime = maxArrivalTime;
            HasMatch = false;
        }

        public LatLng Start { get; }
        public LatLng End { get; }
        public DateTime MaxArrivalTime { get; }
        public bool HasMatch { get; }
    }
}