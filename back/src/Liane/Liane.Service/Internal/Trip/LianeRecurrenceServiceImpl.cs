using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class LianeRecurrenceServiceImpl: MongoCrudEntityService<LianeRecurrence>, ILianeRecurrenceService
{

  private readonly IRallyingPointService rallyingPointService;
  public LianeRecurrenceServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext, IRallyingPointService rallyingPointService) : base(mongo, currentContext)
  {
    this.rallyingPointService = rallyingPointService;
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

  private async Task<LianeRecurrence> ResolveRallyingPoints(LianeRecurrence recurrence)
  {
    return recurrence with
    {
      InitialRequest = recurrence.InitialRequest with
      {
        From = await rallyingPointService.Get(recurrence.InitialRequest.From),
        To = await rallyingPointService.Get(recurrence.InitialRequest.To)
      }
    };
  }

  public async Task<ImmutableList<LianeRecurrence>> ListForCurrentUser()
  {
    return await Mongo.GetCollection<LianeRecurrence>().Find(r => r.CreatedBy == CurrentContext.CurrentUser().Id)
      .SelectAsync(ResolveRallyingPoints);
  }

  public async Task<LianeRecurrence> GetWithResolvedRefs(Ref<LianeRecurrence> recurrence)
  {
    var fetched = await Get(recurrence);
    return await ResolveRallyingPoints(fetched);
  }

  protected override Task<LianeRecurrence> ToDb(LianeRecurrence inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return Task.FromResult(inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy });
  }
  
  
}