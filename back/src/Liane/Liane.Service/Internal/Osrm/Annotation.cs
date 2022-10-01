using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm;

/// <summary>
/// 
/// </summary>
/// <param name="Distance">The distance, in metres, between each pair of coordinates.</param>
/// <param name="Duration">The duration between each pair of coordinates, in seconds. Does not include the duration of any turns.</param>
/// <param name="Weight">The weights between each pair of coordinates. Does not include any turn costs.</param>
/// <param name="Nodes">The OSM node ID for each coordinate along the route, excluding the first/last user-supplied coordinates</param>
/// <param name="Speed">Convenience field, calculation of distance / duration rounded to one decimal place</param>
/// <param name="Datasources">The index of the datasource for the speed between each pair of coordinates. 0 is the default profile, other values are supplied via --segment-speed-file to osrm-contract or osrm-customize. String-like names are in the metadata.datasource_names array.</param>
/// <param name="DatasourceNames"> The names of the datasources used for the speed between each pair of coordinates. lua profile is the default profile, other values arethe filenames supplied via --segment-speed-file to osrm-contract or osrm-customize</param>
public sealed record Annotation(
    ImmutableList<double> Distance,
    ImmutableList<double> Duration,
    ImmutableList<double> Weight,
    ImmutableList<long> Nodes,
    ImmutableList<float>? Speed,
    ImmutableList<long> Datasources,
    ImmutableList<string> DatasourceNames
);