using Liane.Api.Routing;
using NUnit.Framework;

namespace Liane.Test.Routing;

[TestFixture]
public sealed class LatLngTest
{
  [Test]
  public void ShouldCalculateDistance()
  {
    var from = new LatLng(53.32055555555556, -1.7297222222222221);
    var to = new LatLng(53.31861111111111, -1.6997222222222223);
    Assert.AreEqual(2006.0981825049357d, from.Distance(to));
  }

  [Test]
  public void ShouldIntersect()
  {
    var a = new LatLng(3.499084, 44.518149);
    var b = new LatLng(3.461412, 44.50666);
    var c = new LatLng(3.499084, 44.518149);
    var d = new LatLng(3.461412, 44.50666);
    var actual = LatLngExtensions.LineSegmentsIntersect(a, b, c, d, out var intersection);
    Assert.IsTrue(actual);
    Assert.AreEqual(a, intersection);
  }
}