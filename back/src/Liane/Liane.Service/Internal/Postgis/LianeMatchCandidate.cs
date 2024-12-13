using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Postgis;

public enum MatchResultMode
{
  Exact,
  Partial,
  Detour
}
public sealed record LianeMatchCandidate(
    Ref<Api.Trip.Trip> Liane,
    LatLng Pickup,
    LatLng Deposit,
    double StartFraction,
    double EndFraction,
    MatchResultMode Mode
);