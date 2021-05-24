using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip
{
    public sealed class RealTripServiceImpl : IRealTripService
    {
        private readonly MongoClient client;
        private readonly ICurrentContext currentContext;
        private readonly ILogger<RealTripServiceImpl> logger;

        public RealTripServiceImpl(ICurrentContext currentContext, MongoSettings settings, ILogger<RealTripServiceImpl> logger)
        {
            this.currentContext = currentContext;
            this.logger = logger;
            var credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password);
            client = new MongoClient(new MongoClientSettings
            {
                Server = new MongoServerAddress(settings.Host, 27017),
                Credential = credential
            });
        }

        public async Task Save(ImmutableHashSet<RealTrip> trips)
        {
            var currentUser = currentContext.CurrentUser();
            var database = client.GetDatabase("liane");
            var collection = database.GetCollection<UserTrip>("trip");
            if (!trips.IsEmpty)
            {
                logger.LogInformation("{Count} trip(s) saved for user '{currentUser}'", trips.Count, currentUser);
                await collection.DeleteManyAsync(u => u.UserId == currentUser);
                await collection.InsertManyAsync(
                    trips.Select(t => new UserTrip(ObjectId.GenerateNewId(), currentUser, t.From, t.To, t.StartTime, t.EndTime))
                );
            }
        }

        public async Task<ImmutableHashSet<RealTrip>> List()
        {
            var currentUser = currentContext.CurrentUser();
            var database = client.GetDatabase("liane");
            var collection = database.GetCollection<UserTrip>("trip");
            var asyncCursor = await collection.FindAsync(new ExpressionFilterDefinition<UserTrip>(u => u.UserId == currentUser));
            return asyncCursor.ToEnumerable()
                .Select(u => new RealTrip(u.From, u.To, u.StartTime, u.EndTime))
                .OrderByDescending(u => u.StartTime)
                .ToImmutableHashSet();
        }
    }
}