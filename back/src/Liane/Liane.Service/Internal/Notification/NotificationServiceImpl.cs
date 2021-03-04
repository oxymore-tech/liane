using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Notification;
using IRedis = Liane.Api.Util.IRedis;
using Liane.Api.Util.Http;
using StackExchange.Redis;
using System;
using System.Collections.Generic;

namespace Liane.Service.Internal.Notification
{
    public sealed class NotificationServiceImpl : INotificationService
    {
        private readonly IRedis redis;
        private readonly ICurrentContext currentContext;

        public NotificationServiceImpl(IRedis redis, ICurrentContext currentContext)
        {
            this.redis = redis;
            this.currentContext = currentContext;
        }

        public async Task addNotification(string user, Api.Notification.Notification notification)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("notifications_" + user);
            HashEntry[] newEntry = { new HashEntry(notification.date, notification.message) };
            await database.HashSetAsync(redisKey, newEntry);
        }

        public async Task deleteNotification(int date)
        {
            var user = currentContext.CurrentUser();
            var database = await redis.Get();
            var redisKey = new RedisKey("notifications_" + user);
            await database.HashDeleteAsync(redisKey, date);
        }

        public async Task<ImmutableList<Api.Notification.Notification>> getNotifications()
        {
            Console.WriteLine("USER : " + currentContext.CurrentUser());
            var user = currentContext.CurrentUser();
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