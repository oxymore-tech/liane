using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeStatusUpdate : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly INotificationService notificationService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly IUserService userService;

  public LianeStatusUpdate(ILogger<LianeStatusUpdate> logger, IMongoDatabase mongo, INotificationService notificationService, IRallyingPointService rallyingPointService,
    IUserService userService) : base(logger, "* * * * *",
    false)
  {
    this.mongo = mongo;
    this.notificationService = notificationService;
    this.rallyingPointService = rallyingPointService;
    this.userService = userService;
  }

  protected override Task DoWork(CancellationToken cancellationToken) => Update(DateTime.UtcNow, TimeSpan.FromMinutes(5));

  public async Task Update(DateTime from, TimeSpan window)
  {
    var to = from.Add(window);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted || l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > from && w.Eta <= to);
    await mongo.GetCollection<LianeDb>()
      .Find(filter)
      .ForEachAsync(l => SendReminder(l, from, to));
  }

  private async Task SendReminder(LianeDb liane, DateTime from, DateTime to)
  {
    if (liane.WayPoints is null)
    {
      return;
    }

    foreach (var wayPoint in liane.WayPoints.Where(w => w.Eta > from && w.Eta <= to))
    {
      var members = await GetRecipients(liane, wayPoint);
      if (members.IsEmpty)
      {
        continue;
      }

      var rallyingPoint = await wayPoint.RallyingPoint.Resolve(rallyingPointService.Get);
      await notificationService.SendReminder("Départ dans 5 minutes",
        $"Vous avez RDV dans 5 minutes à '{rallyingPoint.Label}'.",
        members,
        new Reminder(liane.Id, wayPoint.RallyingPoint, wayPoint.Eta));
    }
  }

  private async Task<ImmutableList<Ref<Api.User.User>>> GetRecipients(LianeDb liane, WayPointDb wayPoint)
  {
    var list = new List<Ref<Api.User.User>>();
    foreach (var r in liane.Members.Where(m => m.From.Id == wayPoint.RallyingPoint.Id)
               .Select(m => m.User))
    {
      var user = await userService.Get(r);
      if ((user.Pseudo ?? "").StartsWith("Bot "))
      {
        continue;
      }

      list.Add(r);
    }

    return list.ToImmutableList();
  }
}