using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface IEventService : ICrudService<Event>
{
  Task<Event> Create(Ref<Trip.Liane> liane, LianeEvent lianeEvent);

  Task<Event> Answer(Ref<Event> id, LianeEvent lianeEvent);

  Task MarkAsRead(Ref<Event> id);

  Task<int> GetUnreadCount(Ref<User.User> user);

  Task<PaginatedResponse<Event>> List(Pagination pagination) => List<LianeEvent>(new EventFilter(true, null), pagination);

  Task<PaginatedResponse<Event>> List(EventFilter eventFilter, Pagination pagination) => List<LianeEvent>(eventFilter, pagination);

  Task<PaginatedResponse<Event>> List<T>(EventFilter eventFilter, Pagination pagination) where T : LianeEvent;
}