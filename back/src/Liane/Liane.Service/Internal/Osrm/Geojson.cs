﻿using System.Collections.Immutable;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Osrm
{
    public sealed class Geojson
    {
        // TODO: comment on GeoJSON structure
        public Geojson(string type, ImmutableList<LngLat> coordinates)
        {
            Type = type;
            Coordinates = coordinates;
        }

        public string Type { get; }
        public ImmutableList<LngLat> Coordinates { get; }

        public override string ToString()
        {
            return "Geometry object here"; // raccourci car trop gros
            //            return StringUtils.ToString(this);
        }
    }
}