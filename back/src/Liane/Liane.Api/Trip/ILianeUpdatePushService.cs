using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeUpdatePushService
{
  Task<TrackingInfo?> GetLastTrackingInfo(Ref<Liane> liane);
  Task Push(TrackingInfo update, Ref<User.User> user);
}