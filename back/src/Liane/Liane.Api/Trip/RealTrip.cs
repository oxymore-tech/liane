using System;

namespace Liane.Api.Trip
{
    public sealed record RealTrip(
        Location From,
        Location To,
        DateTime StartTime,
        DateTime EndTime
    );
}