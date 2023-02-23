using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Notification;

/// <summary>
/// Hub methods callable from service layer
/// </summary>
public interface IHubService 
{
   bool IsConnected(Ref<Api.User.User> user);

   Task<bool> TrySendNotification(Ref<Api.User.User> receiver, BaseNotification notification);

}