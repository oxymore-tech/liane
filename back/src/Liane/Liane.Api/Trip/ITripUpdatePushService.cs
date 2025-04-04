using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ITripUpdatePushService
{
  Task<TrackingInfo?> GetLastTrackingInfo(Ref<Trip> liane);
}