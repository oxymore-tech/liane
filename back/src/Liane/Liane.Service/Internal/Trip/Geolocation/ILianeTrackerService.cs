using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Geolocation;

public interface ILianeTrackerService
{
  const double NearPointDistanceInMeters = 100;
  Task Start(Api.Trip.Liane liane);
  Task PushPing(Ref<Api.Trip.Liane> liane, UserPing ping);
}