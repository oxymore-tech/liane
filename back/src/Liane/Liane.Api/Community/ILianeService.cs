using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

using IncomingTrips = ImmutableDictionary<DayOfWeek, ImmutableList<IncomingTrip>>;

public interface ILianeService
{
  Task<LianeRequest> Create(LianeRequest request);
  Task<LianeRequest> Update(Ref<LianeRequest> id, LianeRequest request);
  Task Delete(Ref<LianeRequest> id);
  Task<ImmutableList<LianeMatch>> Match();
  Task<LianeMatch> Match(Guid lianeRequestId);
  Task<ImmutableList<Liane>> List(LianeFilter filter);

  Task<Liane> Get(Ref<Liane> id);
  Task<Liane?> JoinRequest(Ref<LianeRequest> lianeRequest, Ref<Liane> liane);
  Task<bool> Reject(Ref<LianeRequest> lianeRequest, Ref<Liane> liane);
  Task<bool> Leave(Ref<Liane> liane);

  Task<ImmutableList<WayPoint>> GetTrip(Guid liane, Guid? lianeRequest);
  Task<PendingMatch?> Matches(Guid liane, Ref<RallyingPoint> from, Ref<RallyingPoint> to);
  Task<bool> JoinTrip(JoinTripQuery query);
  Task<IncomingTrips> GetIncomingTrips();
}