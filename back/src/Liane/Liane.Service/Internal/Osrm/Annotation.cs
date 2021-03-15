using System.Collections.Immutable;
using Liane.Api.Util;

namespace Liane.Service.Internal.Osrm
{
    // TODO: comment explaining Annotation object
    public sealed class Annotation
    {
        public Annotation(ImmutableList<double> distance, ImmutableList<double> duration, ImmutableList<double> weight, ImmutableList<long> nodes, ImmutableList<float>? speed, ImmutableList<long> datasources, ImmutableList<string> datasourceNames)
        {
            Distance = distance;
            Duration = duration;
            Weight = weight;
            Nodes = nodes;
            Speed = speed;
            Datasources = datasources;
            DatasourceNames = datasourceNames;
        }

        // The distance, in metres, between each pair of coordinates.
        public ImmutableList<double> Distance { get; }
        // The duration between each pair of coordinates, in seconds. Does not include the duration of any turns.
        public ImmutableList<double> Duration { get; }
        // The weights between each pair of coordinates. Does not include any turn costs.
        public ImmutableList<double> Weight { get; }

        // The OSM node ID for each coordinate along the route, excluding the first/last user-supplied coordinates
        public ImmutableList<long> Nodes { get; }
        // Convenience field, calculation of distance / duration rounded to one decimal place
        public ImmutableList<float> ?Speed { get; }

        // The index of the datasource for the speed between each pair of coordinates. 0 is the default profile, other values are supplied via --segment-speed-file to osrm-contract or osrm-customize.
        // String-like names are in the metadata.datasource_names array.
        public ImmutableList<long> Datasources { get; }
        //  The names of the datasources used for the speed between each pair of coordinates. lua profile is the default profile, other values arethe filenames supplied via --segment-speed-file to osrm-contract or osrm-customize
        public ImmutableList<string> DatasourceNames { get; } // ATTENTION contenu dans metadata

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }

    }
}