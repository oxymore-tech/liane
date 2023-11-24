using System.Collections.Concurrent;
using System.Collections.Generic;

namespace Liane.Service.Internal.Trip;

public interface ILianeTrackerCache
{
   ConcurrentDictionary<string, LianeTracker> Trackers { get; }
   
   ConcurrentDictionary<(string Liane, string Member), ConcurrentDictionary<string, bool>> Subscribers { get; }
}

public class LianeTrackerCacheImpl : ILianeTrackerCache
{
  public ConcurrentDictionary<string, LianeTracker> Trackers { get; } = new ();
  public  ConcurrentDictionary<(string Liane, string Member), ConcurrentDictionary<string, bool>> Subscribers { get; } = new();
  
}