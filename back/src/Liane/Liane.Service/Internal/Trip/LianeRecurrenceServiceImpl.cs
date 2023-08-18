using System;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class LianeRecurrenceServiceImpl: MongoCrudEntityService<LianeRecurrence>, ILianeRecurrenceService
{
  public LianeRecurrenceServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext) : base(mongo, currentContext)
  {
  }

  public async Task Update(Ref<LianeRecurrence> recurrence, DayOfTheWeekFlag days)
  {
    if (days.IsNever)
    {
      await Mongo.GetCollection<LianeRecurrence>().FindOneAndUpdateAsync(r => r.Id == recurrence.Id, 
          Builders<LianeRecurrence>.Update.Set(r => r.Active, false)
      );
    }
    else
    {
      await Mongo.GetCollection<LianeRecurrence>().FindOneAndUpdateAsync(r => r.Id == recurrence.Id, 
        Builders<LianeRecurrence>.Update.Combine(
          Builders<LianeRecurrence>.Update.Set(r => r.Days, days),
          Builders<LianeRecurrence>.Update.Set(r => r.Active, true)
        )
      );
    }
  
  }
  
  protected override Task<LianeRecurrence> ToDb(LianeRecurrence inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return Task.FromResult(inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy });
  }
  
  
}