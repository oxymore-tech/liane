using System;
using System.Collections.Immutable;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class RallyingPointRequestServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext, IRallyingPointService rallyingPointService)
  : MongoCrudEntityService<RallyingPointRequest>(mongo, currentContext), IRallyingPointRequestService
{
  public async Task<PaginatedResponse<RallyingPointRequest>> ListForCurrentUser(Pagination pagination)
  {
    var filter = Builders<RallyingPointRequest>.Filter.Eq<string>(r => r.CreatedBy!, CurrentContext.CurrentUser().Id);
    return await Collection.PaginateTime(
        pagination,
        r => r.CreatedAt,
        filter
      ) with
      {
        TotalCount = await Count(filter)
      };
  }

  public async Task<PaginatedResponse<RallyingPointRequest>> Paginate(Pagination pagination)
  {
    var filter = Builders<RallyingPointRequest>.Filter.Eq(r => r.Status, null)
                 | Builders<RallyingPointRequest>.Filter.IsInstanceOf("payload", typeof(RallyingPointRequestStatus.InReview));
    return await Collection.PaginateTime(pagination, r => r.CreatedAt, filter) with { TotalCount = await Count(filter) };
  }

  public async Task<RallyingPointRequest> UpdateRequestStatus(Ref<RallyingPointRequest> req, RallyingPointRequestStatus status)
  {
    var request = await Update(req, Builders<RallyingPointRequest>.Update.Set(r => r.Status, status));
    if (status is not RallyingPointRequestStatus.Accepted)
    {
      return request;
    }

    var pointId = "user:" + ObjectId.GenerateNewId();
    await rallyingPointService.Insert([request.Point with { Id = pointId }]);
    return request;
  }

  protected override Task<RallyingPointRequest> ToDb(RallyingPointRequest inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return Task.FromResult(inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy });
  }
  
  public async Task<FeatureCollection> GetDepartment(string n)
  {
    var filter = Builders<RallyingPointRequest>.Filter.Regex(r => r.Point.ZipCode, new BsonRegularExpression(new Regex(n+"\\d{3}")));
    var fc = new FeatureCollection((await Collection.Find(filter).ToListAsync()).Select(r =>
    {
      var location = r.Point.Location.ToGeoJson();
      var f = new Feature(location, r, r.Id);
      var transformedProperties = f.Properties.Keys.Select(key => (key.NormalizeToCamelCase(), f.Properties[key]))
        .ToImmutableDictionary(entry => entry.Item1, entry => entry.Item2);
      return new Feature(location, transformedProperties, f.Id);
    }).ToList());
    return fc;
  }
}