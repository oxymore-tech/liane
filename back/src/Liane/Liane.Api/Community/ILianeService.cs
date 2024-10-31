using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public interface ILianeService
{
  Task<LianeRequest> Create(LianeRequest request);
  Task<LianeRequest> Update(Ref<LianeRequest> id, LianeRequest request);
  Task Delete(Ref<LianeRequest> id);
  Task<ImmutableList<LianeMatch>> Match();
  Task<ImmutableList<Liane>> List(LianeFilter filter);

  Task<Liane> Get(Ref<Liane> id);
  Task<Liane?> JoinRequest(Ref<Liane> a, Ref<Liane> b);
  Task<bool> Reject(Ref<Liane> a, Ref<Liane> b);
  Task<bool> Leave(Ref<Liane> liane);

  Task<ImmutableList<WayPoint>> GetTrip(Guid liane, Guid? lianeRequest);
  Task<bool> JoinTrip(JoinTripQuery query);
}