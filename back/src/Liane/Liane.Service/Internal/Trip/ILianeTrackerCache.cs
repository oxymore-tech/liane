using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace Liane.Service.Internal.Trip;

public interface ILianeTrackerCache
{
   ConcurrentDictionary<string, LianeTracker> Trackers { get; }
}