using System.Collections.Generic;
using System.Linq;
using StackExchange.Redis;

namespace Liane.Service.Internal.Display;

public static class RedisFilterExtensions
{
    public static IEnumerable<RedisKey> FilterByStartHour(this IEnumerable<RedisKey> edgeKeys, int hour = 0)
    {
        return edgeKeys.Where(key =>
        {
            var listPipe = key.ToString().Split("|");
            return short.Parse(listPipe[^1]) >= hour;
        });
    }

    public static IEnumerable<RedisKey> FilterByEndHour(this IEnumerable<RedisKey> edgeKeys, int hour = 24)
    {
        return edgeKeys.Where(key =>
        {
            var listPipe = key.ToString().Split("|");
            return int.Parse(listPipe[^1]) <= hour;
        });
    }

    public static IEnumerable<RedisKey> FilterByStartPoint(this IEnumerable<RedisKey> edgeKeys, string startPoint)
    {
        return edgeKeys.Where(key =>
        {
            var listPipe = key.ToString().Split("|");
            return listPipe[0] == startPoint;
        });
    }

    public static IEnumerable<RedisKey> FilterByEndPoint(this IEnumerable<RedisKey> edgeKeys, string endPoint)
    {
        return edgeKeys.Where(key =>
        {
            var listPipe = key.ToString().Split("|");
            return listPipe[1] == endPoint;
        });
    }
}