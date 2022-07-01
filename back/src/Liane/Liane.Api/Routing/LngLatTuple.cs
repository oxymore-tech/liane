using System;
using System.Text.Json.Serialization;

namespace Liane.Api.Routing;

[JsonConverter(typeof(LngLatTupleJsonConverter))]
public sealed class LngLatTuple : Tuple<double, double>
{
    public LngLatTuple(double lng, double lat) : base(lng, lat)
    {
    }

    public double Lat => Item2;
    public double Lng => Item1;

    public LatLng ToLatLng()
    {
        return new(Lat, Lng);
    }
}