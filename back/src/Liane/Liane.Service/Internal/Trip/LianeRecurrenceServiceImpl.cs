using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class LianeRecurrenceServiceImpl(
  IMongoDatabase mongo,
  ICurrentContext currentContext,
  IRallyingPointService rallyingPointService)
  : MongoCrudEntityService<LianeRecurrence>(mongo, currentContext), ILianeRecurrenceService
{
  public async Task Update(Ref<LianeRecurrence> recurrence, DayOfWeekFlag days)
  {
    if (days == DayOfWeekFlag.None)
    {
      await Mongo.GetCollection<LianeRecurrence>().FindOneAndUpdateAsync(r => r.Id == recurrence.Id,
        Builders<LianeRecurrence>.Update.Set(r => r.Active, false)
      );
    }
    else
    {
      var nextRecurrenceDate = days.GetNextActiveDates(DateTime.UtcNow, DateTime.UtcNow.AddDays(7)).First();
      var resolved = await Get(recurrence);
      await Mongo.GetCollection<LianeRecurrence>().UpdateOneAsync(r => r.Id == recurrence.Id,
        Builders<LianeRecurrence>.Update.Combine(
          Builders<LianeRecurrence>.Update.Set(r => r.InitialRequest,
            resolved.InitialRequest with
            {
              DepartureTime = new DateTime(nextRecurrenceDate.Year, nextRecurrenceDate.Month, nextRecurrenceDate.Day, resolved.InitialRequest.DepartureTime.Hour,
                resolved.InitialRequest.DepartureTime.Minute, resolved.InitialRequest.DepartureTime.Second, DateTimeKind.Utc),
              ReturnTime = resolved.InitialRequest.ReturnTime is null
                ? null
                : new DateTime(nextRecurrenceDate.Year, nextRecurrenceDate.Month, nextRecurrenceDate.Day, resolved.InitialRequest.ReturnTime.Value.Hour,
                  resolved.InitialRequest.ReturnTime.Value.Minute, resolved.InitialRequest.ReturnTime.Value.Second, DateTimeKind.Utc),
            }),
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

  public Task ClearForMember(string id)
  {
    return Mongo.GetCollection<LianeRecurrence>()
      .DeleteManyAsync(r => r.CreatedBy == id);
  }

  public async Task<IEnumerable<LianeRecurrence>> GetUpdatableRecurrences(DayOfWeek? day = null)
  {
    var targetDay = (day ?? DateTime.UtcNow.DayOfWeek).ToFlag();
    var pattern = targetDay.PrintToString('.');
    var filter = Builders<LianeRecurrence>.Filter.Where(r => r.Active) & Builders<LianeRecurrence>.Filter.Regex(r => r.Days, new BsonRegularExpression(new string(pattern)));
    var recurrences = await Mongo.GetCollection<LianeRecurrence>()
      .FindAsync(filter);
    return recurrences.ToEnumerable();
  }

  protected override Task<LianeRecurrence> ToDb(LianeRecurrence inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return Task.FromResult(inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy });
  }
}