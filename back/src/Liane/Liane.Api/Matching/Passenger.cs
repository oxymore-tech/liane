using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Liane.Api.Routing;

namespace Liane.Api.Matching
{
    public sealed class Passenger
    {
        public Passenger(LatLng waypoint, string id)
        {
            Waypoint = waypoint;
            Passengers.Add(id, this);
        }

        public LatLng Waypoint { get; }
        private static readonly ImmutableDictionary<string, Passenger> Passengers = ImmutableDictionary<string, Passenger>.Empty;

        public static Dictionary<string, Passenger> GetPassengers()
        {
            return new Dictionary<string,Passenger>(Passengers);
        }

        // public static Driver GetPassenger(string id)
        // {
        //     if (Passengers.TryGetValue(id, out var passenger))
        //         return passenger;
        //     throw new NotSupportedException();
        // }

        // public static void ResetDriverList()
        // {
        //     Passengers = ImmutableDictionary<string, Driver>.Empty;
        // }
    }
}