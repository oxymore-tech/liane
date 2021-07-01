using System.Collections.Generic;

namespace Liane.Api.Trip
{
    public sealed record LianeDate(
        Days Day,
        int Hour,
        List<UserStatistics> Statistics
    );
}