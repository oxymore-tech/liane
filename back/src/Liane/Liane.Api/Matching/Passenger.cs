using System;
using Liane.Api.Routing;

namespace Liane.Api.Matching
{
    public sealed class Passenger : User
    {
        public Passenger(LatLng start, LatLng end, double arriveInMaxSecondsFromNow = 0)
        {
            Start = start;
            End = end;
            MaxArrivalTime = DateTime.Now.AddSeconds(arriveInMaxSecondsFromNow);
            HasMatch = false;
        }

        public LatLng Start { get; }
        public LatLng End { get; }
        public DateTime MaxArrivalTime { get; }
        public bool HasMatch { get; }
    }
}