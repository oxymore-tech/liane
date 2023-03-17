using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface IEventService : ICrudService<Event>
{
  Task<Event> Create(LianeEvent lianeEvent);

  Task<Event> Answer(Ref<Event> id, LianeEvent lianeEvent);

  Task MarkAsRead(Ref<Event> id);

  Task<int> GetUnreadCount(Ref<User.User> user);

  Task<PaginatedResponse<Event>> List(EventFilter eventFilter, Pagination pagination);
}