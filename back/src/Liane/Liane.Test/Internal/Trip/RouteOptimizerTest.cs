using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Trip;
using NUnit.Framework;

namespace Liane.Test.Internal.Trip;

using LngLatTuple = Tuple<double, double>;
public class RouteOptimizerTest
{
  
  [Test]
  public void ShouldOverlap()
  {
    var s1 = ImmutableList.Create(
      
      new LngLatTuple(1.1d, 1.2d),
      new LngLatTuple(1.1d, 1.5d),
      new LngLatTuple(1.1d, 2d),
      
      new LngLatTuple(1.5d, 2d),
      new LngLatTuple(1.5d, 2.5d),
      new LngLatTuple(3.5d, 2.5d),
      
      new LngLatTuple(7.5d, 2.5d),
      new LngLatTuple(7.5d, 3d)
    );
    var s2 = ImmutableList.Create(

      new LngLatTuple(1.5d, 2d),
      new LngLatTuple(1.5d, 2.5d),
      new LngLatTuple(3.5d, 2.5d),
      
      new LngLatTuple(3.5d, 3d),
      new LngLatTuple(3.5d, 4d)
      
    );
    
    var raw = ImmutableList.Create(new TripSegment(s1, ImmutableList.Create<Ref<Api.Trip.Trip>>("a")), new TripSegment(s2, ImmutableList.Create<Ref<Api.Trip.Trip>>("b", "c")));

    var result = RouteOptimizer.TruncateOverlappingSegments(raw);
               Assert.AreEqual(4, result.Count);
  }
}