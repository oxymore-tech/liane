using System;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Live;

public sealed class LianeReminder : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly ILianeService lianeService;

  public LianeReminder(ILogger logger, IMongoDatabase mongo, ILianeService lianeService) : base(logger, "* * * * *", false)
  {
    this.mongo = mongo;
    this.lianeService = lianeService;
  }

  protected override async Task DoWork(CancellationToken cancellationToken)
  {
    var now = DateTime.UtcNow;
    var selectAsync = await mongo.GetCollection<LianeDb>()
      .Find(l =>
        l.DepartureTime >= now
        && (
          (l.State == LianeState.NotStarted && l.DepartureTime <= now.AddMinutes(5)) || l.State == LianeState.Started))
      .SelectAsync(l => lianeService.GetWayPoints(l.Driver.User, l.Members));
  }
}