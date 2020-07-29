using Liane.Api.Routing;

namespace Liane.Api.Matching
{
    public sealed class Driver : User
    {
        public Driver(LatLng start, LatLng end, float maxDelta)
        {
            Start = start;
            End = end;
            MaxDelta = maxDelta;
            NbOfSeat = 1;
        }

        public LatLng Start { get; }
        public LatLng End { get; }
        public float MaxDelta { get; }
        public int NbOfSeat { get; }
    }
}