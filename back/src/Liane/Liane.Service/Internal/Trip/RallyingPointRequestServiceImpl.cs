using System;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class RallyingPointRequestServiceImpl : MongoCrudEntityService<RallyingPointRequest>, IRallyingPointRequestService
{

  private readonly IRallyingPointService rallyingPointService;
  
  public RallyingPointRequestServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext, IRallyingPointService rallyingPointService) : base(mongo, currentContext)
  {
    this.rallyingPointService = rallyingPointService;
  }

  public async Task<PaginatedResponse<RallyingPointRequest>> ListForCurrentUser(Pagination pagination)
  {
    var filter = Builders<RallyingPointRequest>.Filter.Eq<string>(r => r.CreatedBy, CurrentContext.CurrentUser().Id);
    return await Collection.PaginateTime(
      pagination, 
      r => r.CreatedAt,
      filter
    )  with {TotalCount = await Count(filter)};
  }

  public async Task<PaginatedResponse<RallyingPointRequest>> Paginate(Pagination pagination)
  {
    var filter = Builders<RallyingPointRequest>.Filter.Eq(r => r.Status, null)
                 | Builders<RallyingPointRequest>.Filter.IsInstanceOf("payload", typeof(RallyingPointRequestStatus.InReview));
    return await Collection.PaginateTime(pagination, r => r.CreatedAt, filter) with {TotalCount = await Count(filter)};
  }

  public async Task<RallyingPointRequest> UpdateRequestStatus(Ref<RallyingPointRequest> req, RallyingPointRequestStatus status)
  {
    var request = await Update(req, Builders<RallyingPointRequest>.Update.Set(r => r.Status, status));
    if (status is RallyingPointRequestStatus.Accepted)
    {
      var pointId = "user:"+ObjectId.GenerateNewId();
      await rallyingPointService.Insert(new[] { request.Point with {Id = pointId}});
    }
    return request;
  }

  protected async override Task<RallyingPointRequest> ToDb(RallyingPointRequest inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy };
  }
}