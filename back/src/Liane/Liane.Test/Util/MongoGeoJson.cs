using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Trip;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Test.Util;

public static class MongoGeoJson
{
  
  public static async Task<GeoJsonFeatureCollection<GeoJson2DGeographicCoordinates>> Debug(IMongoDatabase db)
  {
    var geometries = await db.GetCollection<LianeDb>()
      .Find(FilterDefinition<LianeDb>.Empty)
      .Project(l => new GeoJsonFeature<GeoJson2DGeographicCoordinates>(l.Geometry))
      .ToListAsync();

    var points = await db.GetCollection<RallyingPoint>()
      .Find(FilterDefinition<RallyingPoint>.Empty)
      .Project(l => new GeoJsonFeature<GeoJson2DGeographicCoordinates>(new GeoJsonPoint<GeoJson2DGeographicCoordinates>(new GeoJson2DGeographicCoordinates(l.Location.Lng, l.Location.Lat))))
      .ToListAsync();
    
    return new GeoJsonFeatureCollection<GeoJson2DGeographicCoordinates>(geometries.Concat(points));
  }
  
}