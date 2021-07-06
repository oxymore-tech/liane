using System.Collections.Generic;

namespace Liane.Api.Trip
{
    public sealed record LianeTrip(
        string Id,
        long Timestamp,
        List<Liane> Lianes
    );
}