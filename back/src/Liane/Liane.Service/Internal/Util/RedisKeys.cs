using System;
using Liane.Api.Util;
using StackExchange.Redis;

namespace Liane.Service.Internal.Util
{
    public static class RedisKeys
    {
        public static RedisKey RallyingPoint()
        {
            return "rallying_point";
        }

        public static RedisKey Notification(string phone)
        {
            return $"notification:{phone}";
        }

        public static RedisKey NotificationToken(string phone)
        {
            return $"notification_token:{phone}";
        }

        public static RedisKey Position(string phone)
        {
            return $"position:${phone}";
        }

        public static RedisKey Trip(string? from = null, string? to = null, DayOfWeek? day = null, int? time = null)
        {
            var dayClause = day.GetOrDefault(d => Convert.ToString(d)) ?? "*";
            var timeClause = time.GetOrDefault(Convert.ToString) ?? "*";
            return $"trip:{from ?? "*"}|{to ?? "*"}|{dayClause}|{timeClause}";
        }
    }
}