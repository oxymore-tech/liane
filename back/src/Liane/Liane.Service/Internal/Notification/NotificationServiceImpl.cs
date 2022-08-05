using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Notification.Expo;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.Notification;

public sealed class NotificationServiceImpl : INotificationService
{
    private readonly IRedis redis;
    private readonly ICurrentContext currentContext;
    private readonly ILogger<NotificationServiceImpl> logger;

    public NotificationServiceImpl(IRedis redis, ICurrentContext currentContext, ILogger<NotificationServiceImpl> logger)
    {
        this.redis = redis;
        this.currentContext = currentContext;
        this.logger = logger;
    }

    public async Task NotifyDriver(string user, string name, string number)
    {
        await AddNotification(user,
            new Api.Notification.Notification((int) DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds, name + " veut covoiturez avec vous ! Son numéro est le " + number));
        var database = await redis.Get();
        var redisKey = RedisKeys.NotificationToken(user);
        var token = await database.StringGetAsync(redisKey);
        if (!token.HasValue)
        {
            throw new ArgumentNullException(nameof(token));
        }

        var pushTicketReq = new PushTicketRequest(
            ImmutableList.Create((string) token),
            new
            {
                type = "covoiturage_notification",
                name,
                number
            },
            $"{name} veut covoiturez avec vous !",
            Badge: 1
        );
        var (_, errors) = await PushApiClient.SendPushAsync(pushTicketReq);

        if (errors.Count > 0)
        {
            foreach (var (code, message) in errors)
            {
                logger.LogError("Error: {code} - {message}", code, message);
            }

            throw new ArgumentException("Unable to send notification");
        }
    }

    private async Task AddNotification(string user, Api.Notification.Notification notification)
    {
        var database = await redis.Get();
        var redisKey = RedisKeys.Notification(user);
        var (date, message) = notification;
        var newEntry = new[] {new HashEntry(date, message)};
        await database.HashSetAsync(redisKey, newEntry);
    }

    public async Task DeleteNotification(int date)
    {
        var user = currentContext.CurrentUser();
        var database = await redis.Get();
        var redisKey = RedisKeys.Notification(user.Phone);
        await database.HashDeleteAsync(redisKey, date);
    }

    public async Task<ImmutableList<Api.Notification.Notification>> List()
    {
        var user = currentContext.CurrentUser();
        var database = await redis.Get();
        var redisKey = RedisKeys.Notification(user.Phone);
        var result = await database.HashGetAllAsync(redisKey);

        return result.Select(r => new Api.Notification.Notification(Convert.ToInt32(r.Name), r.Value))
            .ToImmutableList();
    }
}