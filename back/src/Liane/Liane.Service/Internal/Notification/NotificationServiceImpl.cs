using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Notification;
using IRedis = Liane.Api.Util.IRedis;
using Liane.Api.Util.Http;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using Expo.Server.Client;
using Expo.Server.Models;
using Newtonsoft.Json.Linq;

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

        public async Task NotifyDriver(string user, string name, string number) {
            await AddNotification(user, new Api.Notification.Notification((int)DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds, name + " veut covoiturez avec vous ! Son numéro est le "+ number));
            var database = await redis.Get();
            var redisKey = "notification_" + user;
            var token = await database.StringGetAsync(redisKey);
            var expoSDKClient = new PushApiClient();
            var pushTicketReq = new PushTicketRequest() {
                PushTo = new List<string>() { token },
                PushBadgeCount = 1,
                PushBody = name + " veut covoiturez avec vous !",
                PushData = JObject.Parse("{'type': 'covoiturage_notification', 'name':'" + name + "','number': '" + number + "'}")
            };
            var result = expoSDKClient.PushSendAsync(pushTicketReq).GetAwaiter().GetResult();

            if (result.PushTicketErrors.Count > 0)
            {
                foreach (var error in result.PushTicketErrors)
                {
                    Console.WriteLine($"Error: {error.ErrorCode} - {error.ErrorMessage}");
                }
            }
        }

        private async Task AddNotification(string user, Api.Notification.Notification notification)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("notifications_" + user);
            HashEntry[] newEntry = { new HashEntry(notification.date, notification.message) };
            await database.HashSetAsync(redisKey, newEntry);
        }

        public async Task DeleteNotification(int date)
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