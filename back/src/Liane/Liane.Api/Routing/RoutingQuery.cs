namespace Liane.Api.Routing;

public sealed class RoutingQuery
{
    public RoutingQuery(LatLng start, LatLng end)
    {
        Start = start;
        End = end;
    }

    public LatLng Start { get; }
    public LatLng End { get; }
}