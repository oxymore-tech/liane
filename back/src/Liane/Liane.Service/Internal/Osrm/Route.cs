using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm;

/// <summary>
/// 
/// </summary>
/// <param name="Distance">The distance traveled by the route, in float meters.</param>
/// <param name="Duration">The estimated travel time, in float number of seconds.</param>
/// <param name="Weight">The calculated weight of the route.</param>
/// <param name="WeightName">The name of the weight profile used during extraction phase.</param>
/// <param name="Geometry">The whole geometry of the route value depending on overview parameter, either a polyline or a GeoJSON LineString</param>
/// <param name="Legs">The legs between the given waypoints, an array of RouteLeg objects.</param>
public sealed record Route(
    float Distance,
    float Duration,
    float Weight,
    string WeightName,
    Geojson Geometry,
    ImmutableList<Leg> Legs
);