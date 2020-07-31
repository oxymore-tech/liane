using System;
using Liane.Api.Routing;

namespace Liane.Api.Matching
{
    public sealed class Driver : User
    {
        public Driver(LatLng start, LatLng end, float maxDelta, DateTime departureTime)
        {
            Start = start;
            End = end;
            MaxDelta = maxDelta;
            DepartureTime = departureTime;
            NbOfSeat = 1;
        }

        public LatLng Start { get; }
        public LatLng End { get; }
        public float MaxDelta { get; }
        public int NbOfSeat { get; }
        public DateTime DepartureTime { get; }

        private bool Equals(Driver other)
        {
            return Start.Equals(other.Start) && End.Equals(other.End) && MaxDelta.Equals(other.MaxDelta) && NbOfSeat == other.NbOfSeat && DepartureTime.Equals(other.DepartureTime);
        }

        public override bool Equals(object? obj)
        {
            return ReferenceEquals(this, obj) || obj is Driver other && Equals(other);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(Start, End, MaxDelta, NbOfSeat, DepartureTime);
        }
    }
}