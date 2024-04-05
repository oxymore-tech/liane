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

public class TripRecurrenceServiceImpl(
  IMongoDatabase mongo,
  ICurrentContext currentContext,
  IRallyingPointService rallyingPointService)
  : MongoCrudEntityService<TripRecurrence>(mongo, currentContext), ITripRecurrenceService
{
  public async Task Update(Ref<TripRecurrence> recurrence, DayOfWeekFlag days)
  {
    if (days.IsEmpty())
    {
      await Mongo.GetCollection<TripRecurrence>().FindOneAndUpdateAsync(r => r.Id == recurrence.Id,
        Builders<TripRecurrence>.Update.Set(r => r.Active, false)
      );
    }
    else
    {
      var nextRecurrenceDate = days.GetNextActiveDates(DateTime.UtcNow, DateTime.UtcNow.AddDays(7)).First();
      var resolved = await Get(recurrence);
      await Mongo.GetCollection<TripRecurrence>().UpdateOneAsync(r => r.Id == recurrence.Id,
        Builders<TripRecurrence>.Update.Combine(
          Builders<TripRecurrence>.Update.Set(r => r.InitialRequest,
            resolved.InitialRequest with
            {
              DepartureTime = new DateTime(nextRecurrenceDate.Year, nextRecurrenceDate.Month, nextRecurrenceDate.Day, resolved.InitialRequest.DepartureTime.Hour,
                resolved.InitialRequest.DepartureTime.Minute, resolved.InitialRequest.DepartureTime.Second, DateTimeKind.Utc),
              ReturnTime = resolved.InitialRequest.ReturnTime is null
                ? null
                : new DateTime(nextRecurrenceDate.Year, nextRecurrenceDate.Month, nextRecurrenceDate.Day, resolved.InitialRequest.ReturnTime.Value.Hour,
                  resolved.InitialRequest.ReturnTime.Value.Minute, resolved.InitialRequest.ReturnTime.Value.Second, DateTimeKind.Utc),
            }),
          Builders<TripRecurrence>.Update.Set(r => r.Days, days),
          Builders<TripRecurrence>.Update.Set(r => r.Active, true)
        )
      );
    }
  }

  private async Task<TripRecurrence> ResolveRallyingPoints(TripRecurrence recurrence)
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

  public async Task<ImmutableList<TripRecurrence>> ListForCurrentUser()
  {
    return await Mongo.GetCollection<TripRecurrence>().Find(r => r.CreatedBy == CurrentContext.CurrentUser().Id)
      .SelectAsync(ResolveRallyingPoints);
  }

  public async Task<TripRecurrence> GetWithResolvedRefs(Ref<TripRecurrence> recurrence)
  {
    var fetched = await Get(recurrence);
    return await ResolveRallyingPoints(fetched);
  }

  public Task ClearForMember(string id)
  {
    return Mongo.GetCollection<TripRecurrence>()
      .DeleteManyAsync(r => r.CreatedBy == id);
  }

  public async Task<IEnumerable<TripRecurrence>> GetUpdatableRecurrences(DayOfWeek? day = null)
  {
    DayOfWeekFlag targetDay = day ?? DateTime.UtcNow.DayOfWeek;
    var pattern = targetDay.ToString('.');
    var filter = Builders<TripRecurrence>.Filter.Where(r => r.Active) & Builders<TripRecurrence>.Filter.Regex(r => r.Days, new BsonRegularExpression(new string(pattern)));
    var recurrences = await Mongo.GetCollection<TripRecurrence>()
      .FindAsync(filter);
    return recurrences.ToEnumerable();
  }

  protected override Task<TripRecurrence> ToDb(TripRecurrence inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return Task.FromResult(inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy });
  }
}