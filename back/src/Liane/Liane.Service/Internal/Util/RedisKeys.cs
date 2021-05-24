using System;
using Liane.Api.Util;
using StackExchange.Redis;
using Twilio.Types;

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

        public static RedisKey NotificationToken(PhoneNumber phoneNumber)
        {
            return $"notification_token:{phoneNumber}";
        }

        public static RedisKey Position(string phone)
        {
            return $"position:{phone}";
        }

        public static RedisKey Trip(string? from = null, string? to = null, DayOfWeek? day = null, int? time = null)
        {
            var dayClause = day.GetOrDefault(d => Convert.ToString(d)) ?? "*";
            var timeClause = time.GetOrDefault(Convert.ToString) ?? "*";
            return $"trip:{from ?? "*"}|{to ?? "*"}|{dayClause}|{timeClause}";
        }

        public static RedisKey AuthSmsAttempt(PhoneNumber phoneNumber)
        {
            return $"auth_sms_attempt:{phoneNumber}";
        }

        public static RedisKey AuthSmsToken(PhoneNumber phoneNumber)
        {
            return $"auth_sms_token:{phoneNumber}";
        }
    }
}