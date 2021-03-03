using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Notification;
using IRedis = Liane.Api.Util.IRedis;
using StackExchange.Redis;
using System;
using System.Collections.Generic;

namespace Liane.Service.Internal.Notification
{
    public sealed class NotificationServiceImpl : INotificationService
    {
        private readonly IRedis redis;

        public NotificationServiceImpl(IRedis redis)
        {
            this.redis = redis;
        }

        public async Task addNotification(string user, Api.Notification.Notification notification)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("notifications_" + user);
            HashEntry[] newEntry = { new HashEntry(notification.date, notification.message) };
            await database.HashSetAsync(redisKey, newEntry);
        }

        public async Task deleteNotification(string user, int date)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("notifications_" + user);
            await database.HashDeleteAsync(redisKey, date);
        }

        public async Task<ImmutableList<Api.Notification.Notification>> getNotifications(string user)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("notifications_" + user);
            var result = await database.HashGetAllAsync(redisKey);
            List<Api.Notification.Notification> notifs = new List<Api.Notification.Notification>();
            foreach (var r in result)
            {
                Api.Notification.Notification n = new Api.Notification.Notification(Convert.ToInt32(r.Name), r.Value);
                notifs.Add(n);
            }
            return notifs.ToImmutableList();          
        }
    }
}