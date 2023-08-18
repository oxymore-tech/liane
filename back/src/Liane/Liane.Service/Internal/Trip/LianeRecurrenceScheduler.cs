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

public class LianeRecurrenceScheduler : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly ILianeService lianeService;
  public LianeRecurrenceScheduler(ILogger logger, IMongoDatabase mongo, ILianeService lianeService) : base(logger, "0 0 0 * * ?", false)
  {
    this.mongo = mongo;
    this.lianeService = lianeService;
  }

  protected override async Task DoWork(CancellationToken cancellationToken)
  {
    var dayOfWeek = DateTime.UtcNow.DayOfWeek;
    var pattern = Enumerable.Repeat('.', 7).ToArray();
    pattern[(int)dayOfWeek - 1] = '1';
    var recurrences = await mongo.GetCollection<LianeRecurrence>().FindAsync(Builders<LianeRecurrence>.Filter.And(
      Builders<LianeRecurrence>.Filter.Where(r => r.Active), 
      Builders<LianeRecurrence>.Filter.Regex(r => r.Days, new BsonRegularExpression(new string(pattern)))
      ));
    foreach (var r in recurrences.ToEnumerable())
    {
      await lianeService.CreateFromRecurrence( r, r.CreatedBy);
    }
  }
}
