using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeRecurrenceScheduler : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly ILianeService lianeService;

  public LianeRecurrenceScheduler(ILogger<LianeRecurrenceScheduler> logger, IMongoDatabase mongo, ILianeService lianeService) : base(logger, "0 0 * * *", false)
  {
    this.mongo = mongo;
    this.lianeService = lianeService;
  }

  protected override async Task DoWork(CancellationToken cancellationToken)
  {
    Logger.Log(LogLevel.Debug, "Running recurrence scheduler...");
    var now = DateTime.UtcNow;
    var pattern = Enumerable.Repeat('.', 7).ToArray();
    pattern[(int)now.DayOfWeek - 1] = '1';
    var filter = Builders<LianeRecurrence>.Filter.Where(r => r.Active) & Builders<LianeRecurrence>.Filter.Regex(r => r.Days, new BsonRegularExpression(new string(pattern)));
    var recurrences = await mongo.GetCollection<LianeRecurrence>()
      .FindAsync(filter, cancellationToken: cancellationToken);
    foreach (var r in recurrences.ToEnumerable())
    {
      await lianeService.CreateFromRecurrence(r, r.CreatedBy);
    }
  }
}