using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Routing;

namespace Liane.Api.Matching
{
    public sealed class Driver
    {
        public Driver(LatLng start,LatLng end, string id, float maxDelta)
        {
            Start = start;
            End = end;
            MaxDelta = maxDelta;
            drivers.Add(id,this);
        }

        public LatLng Start { get; }
        public  LatLng End { get; }
        public float MaxDelta { get; }
        

        private static ImmutableDictionary<string, Driver> drivers = ImmutableDictionary<string, Driver>.Empty;
        public static Dictionary<string, Driver> GetDrivers()
        {
            return new Dictionary<string,Driver>(drivers);
        }

        // public static void ResetDriverList()
        // {
        //     drivers = ImmutableDictionary<string, Driver>.Empty;
        // }
    }
}