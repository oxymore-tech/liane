using System.Collections.Generic;
using System.Linq;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;

namespace Liane.Api.Trip;

public static class LianeDisplayExtensions
{
  public static IEnumerable<Feature> ToFeatures(this IEnumerable<LianeSegment> segments)
  {
    return segments.Where(s => s.Coordinates.Count > 1)
      .Select(s => new Feature(new LineString(s.Coordinates.Select(c => new Position(c.Item2, c.Item1))), new Dictionary<string, dynamic>
      {
        { "lianes", s.Lianes }
      }));
  }
}