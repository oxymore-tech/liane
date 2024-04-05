using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface IJoinRequestService : IEventListener<TripEvent.JoinRequest>
{
  Task<PaginatedResponse<JoinTripRequest>> List(Pagination pagination);

  Task<JoinTripRequest> Get(Ref<Notification> id);
  
  Task RejectJoinRequests(IEnumerable<Ref<Trip.Trip>> trips);

  Task Delete(Ref<Notification> id);
}