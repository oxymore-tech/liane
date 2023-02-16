using System;
using Liane.Api.Trip;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class JoinLianeRequestServiceImpl : MongoCrudEntityService<JoinLianeRequest>, IJoinLianeRequestService
{
  public JoinLianeRequestServiceImpl(IMongoDatabase mongo) : base(mongo)
  {
  }

  protected override JoinLianeRequest ToDb(JoinLianeRequest inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy };
  }
}