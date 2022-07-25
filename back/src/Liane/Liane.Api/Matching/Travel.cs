using System;
using System.Collections.Immutable;
using Liane.Api.Routing;

namespace Liane.Api.Matching;

public sealed class Travel
{
    public Travel(Route route, Driver driver, int availableSeat, ImmutableList<Passenger> passengers, DateTime arrivaleTime, float deltaMax, ImmutableList<LatLng> waypoints)
    {
        Route = route;
        Driver = driver;
        AvailableSeat = availableSeat;
        Passengers = passengers;
        ArrivaleTime = arrivaleTime;
        DeltaMax = deltaMax;
        Waypoints = waypoints;
    }

    public Route Route { get; }
    public Driver Driver { get; }
    public int AvailableSeat { get; }
    public float DeltaMax { get; }
    public ImmutableList<Passenger> Passengers { get; }
    public ImmutableList<LatLng> Waypoints { get; }
    public DateTime ArrivaleTime { get; }
}