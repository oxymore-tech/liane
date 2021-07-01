using System.Collections.Generic;

namespace Liane.Api.Trip
{
    public sealed record LianeTrip(
        string User,
        List<string> LianeNames
    );
}