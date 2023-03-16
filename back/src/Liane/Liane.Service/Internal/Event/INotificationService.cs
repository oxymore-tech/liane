using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;

namespace Liane.Service.Internal.Event;

public interface INotificationService
{
  Task<Notification> Get(Api.Event.Event e);
  Task<PaginatedResponse<Notification>> List(Pagination pagination);
}