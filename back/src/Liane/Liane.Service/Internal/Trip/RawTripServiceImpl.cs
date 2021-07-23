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
    public class RawTripServiceImpl : IRawTripService
    {
        private const string DatabaseName = "liane";
        private const string CollectionName = "raw_trips";
        
        private readonly MongoClient client;
        private readonly ICurrentContext currentContext;
        private readonly ILogger<RealTripServiceImpl> logger;

        public RawTripServiceImpl(ICurrentContext currentContext, MongoSettings settings, ILogger<RealTripServiceImpl> logger)
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

        public async Task Save(ImmutableList<RawTrip> trips)
        {
            var currentUser = currentContext.CurrentUser();
            var database = client.GetDatabase(DatabaseName);
            var collection = database.GetCollection<UserRawTrip>(CollectionName);
            
            if (!trips.IsEmpty)
            {
                logger.LogInformation("{Count} raw trip(ls) saved for user '{currentUser}'", trips.Count, currentUser);
                await collection.InsertManyAsync(
                    trips.Select(t => new UserRawTrip(ObjectId.GenerateNewId(), currentUser, t.Locations.ToList()))
                );
            }
        }

        public async Task<ImmutableList<RawTrip>> List()
        {
            var currentUser = currentContext.CurrentUser();
            var database = client.GetDatabase(DatabaseName);
            var collection = database.GetCollection<UserRawTrip>(CollectionName);
            var asyncCursor = await collection.FindAsync(new ExpressionFilterDefinition<UserRawTrip>(u => u.UserId == currentUser));
            
            return asyncCursor.ToEnumerable()
                .Select(u => new RawTrip(u.Locations.ToImmutableList(), null))
                .ToImmutableList();
        }

        public async Task<ImmutableList<RawTrip>> ListFor(string userId)
        {
            var database = client.GetDatabase(DatabaseName);
            var collection = database.GetCollection<UserRawTrip>(CollectionName);
            var asyncCursor = await collection.FindAsync(new ExpressionFilterDefinition<UserRawTrip>(u => u.UserId == userId));
            
            return asyncCursor.ToEnumerable()
                .Select(u => new RawTrip(u.Locations.ToImmutableList(), userId))
                .ToImmutableList();
        }

        public async Task<ImmutableList<RawTrip>> ListAll()
        {
            var database = client.GetDatabase(DatabaseName);
            var collection = database.GetCollection<UserRawTrip>(CollectionName);
            var asyncCursor = await collection.FindAsync(_ => true);

            return asyncCursor.ToEnumerable()
                .Select(u => new RawTrip(u.Locations.ToImmutableList(), u.UserId))
                .ToImmutableList();
        }

        public async Task<ImmutableList<RawTrip>> Snap(RawTripFilter rawTripFilter)
        {
            return null;
        }

    }
}