using System.Collections.Immutable;
using Liane.Api.Util;

namespace Liane.Service.Internal.Osrm;

public sealed class Route
{
    public Route(float distance, float duration, float weight, string weightName, Geojson geometry,
        ImmutableList<Leg> legs)
    {
        Distance = distance;
        Duration = duration;
        Weight = weight;
        WeightName = weightName;
        Geometry = geometry;
        Legs = legs;
    }

    /// <summary>
    /// The distance traveled by the route, in float meters.
    /// </summary>
    public float Distance { get; }

    /// <summary>
    /// The estimated travel time, in float number of seconds.
    /// </summary>
    public float Duration { get; }

    /// <summary>
    /// The calculated weight of the route.
    /// </summary>
    public float Weight { get; }

    /// <summary>
    /// The name of the weight profile used during extraction phase.
    /// </summary>
    public string WeightName { get; }

    /// <summary>
    /// The whole geometry of the route value depending on overview parameter,
    /// format depending on the geometries parameter
    /// Either a polyline or a GeoJSON LineString
    /// </summary>
    public Geojson Geometry { get; }

    /// <summary>
    /// The legs between the given waypoints, an array of RouteLeg objects.
    /// </summary>
    public ImmutableList<Leg> Legs { get; }

    public override string ToString()
    {
        return StringUtils.ToString(this);
    }
}