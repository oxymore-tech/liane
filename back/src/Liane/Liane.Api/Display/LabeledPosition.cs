using Liane.Api.Routing;

namespace Liane.Api.Display
{
    public sealed record LabeledPosition(string Label, LatLng Position, double? Distance);
}