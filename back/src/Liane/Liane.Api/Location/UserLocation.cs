using System;
using Liane.Api.Routing;

namespace Liane.Api.Location
{
    public sealed record UserLocation(DateTime timestamp, LngLat position);
}