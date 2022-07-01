using System.Collections.Immutable;

namespace Liane.Api.Routing;

public sealed class DeltaRoute
{
    public DeltaRoute(ImmutableList<LatLng> coordinates, float duration, float distance, float delta)
    {
        Coordinates = coordinates;
        Duration = duration;
        Distance = distance;
        Delta = delta;
    }

    public ImmutableList<LatLng> Coordinates { get; }
    public float Duration { get; }
    public float Distance { get; }
    public float Delta { get; }
     
}