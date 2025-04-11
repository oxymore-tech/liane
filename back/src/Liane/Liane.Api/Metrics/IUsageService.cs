using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Metrics;

public interface IUsageService
{
  Task<UsageSnapshot> GetUsage();
}

public sealed record UsageSnapshot(
  int TotalUsers,
  int TotalUsersInLiane,
  int TotalLianeRequests,
  int TotalLianes,
  int TotalMessages,
  int TotalCreatedTrips,
  int TotalJoinedTrips,
  ImmutableList<UserStat> Users,
  ImmutableList<LianeStat> Lianes,
  ImmutableList<TripStat> Trips);

public sealed record UserStat(
  string UserId,
  int TotalTrips,
  int TotalAvoidedEmissions,
  int TotalCreatedTrips,
  int TotalJoinedTrips
);

public sealed record LianeStat(
  string LianeId,
  int TotalUsers,
  int TotalMessages,
  int TotalCreatedTrips,
  int TotalJoinedTrips
);

public sealed record TripStat(
  string TripId,
  int TotalMembers
);