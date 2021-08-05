using Liane.Api.Trip;
using MongoDB.Bson;

namespace Liane.Service.Internal.Trip
{
    public sealed record UserLianeUsage(
        string User,
        bool IsPrimary,
        long Timestamp,
        ObjectId TripId
    )
    {
        public LianeUsage ToLianeUsage()
        {
            return new LianeUsage(Timestamp, IsPrimary, TripId.ToString());
        }
    }
}