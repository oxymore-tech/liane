using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
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
        
        private const int Radius = 25;
        
        private readonly MongoClient client;
        private readonly ICurrentContext currentContext;
        private readonly ILogger<RealTripServiceImpl> logger;
        
        private readonly IMongoCollection<UserRawTrip> rawTripCollection;

        public RawTripServiceImpl(ICurrentContext currentContext, MongoSettings settings, ILogger<RealTripServiceImpl> logger)
        {
            this.currentContext = currentContext;
            this.logger = logger;

            client = new MongoClient(new MongoClientSettings
            {
                Server = new MongoServerAddress(settings.Host, 27017),
                Credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password)
            });
            
            var database = client.GetDatabase(DatabaseName);
            rawTripCollection = database.GetCollection<UserRawTrip>(CollectionName);
        }

        public async Task Save(ImmutableList<RawTrip> trips)
        {
            if (!trips.IsEmpty)
            {
                var currentUser = currentContext.CurrentUser();
                
                logger.LogInformation("{Count} raw trip(ls) saved for user '{currentUser}'", trips.Count, currentUser);
                
                await rawTripCollection.InsertManyAsync(
                    trips.Select(t => new UserRawTrip(ObjectId.GenerateNewId(), currentUser, t.Locations.ToList()))
                );
            }
        }

        public async Task<ImmutableList<RawTrip>> List()
        {
            var currentUser = currentContext.CurrentUser();
            var asyncCursor = await rawTripCollection.FindAsync(t => t.UserId == currentUser);
            
            return asyncCursor.ToEnumerable()
                .Select(u => new RawTrip(u.Locations.ToImmutableList(), null))
                .ToImmutableList();
        }

        public async Task<ImmutableList<RawTrip>> ListFor(string userId)
        {
            var asyncCursor = await rawTripCollection.FindAsync(t => t.UserId == userId);
            
            return asyncCursor.ToEnumerable()
                .Select(u => new RawTrip(u.Locations.ToImmutableList(), userId))
                .ToImmutableList();
        }

        public async Task<ImmutableList<RawTrip>> ListAll()
        {
            var asyncCursor = await rawTripCollection.FindAsync(_ => true);

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