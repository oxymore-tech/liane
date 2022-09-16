using System.Collections.Immutable;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class TripIntentServiceImpl : ITripIntentService
{
    private readonly ICurrentContext currentContext;
    private readonly IMongoDatabase mongo;

    public TripIntentServiceImpl(MongoSettings settings, ICurrentContext currentContext)
    {
        this.currentContext = currentContext;
        mongo = settings.GetDatabase();
    }

    public async Task<TripIntent> Create(TripIntent tripIntent)
    {
        var id = ObjectId.GenerateNewId();
        var created = tripIntent with { Id = id.ToString() };
        var currentUser = currentContext.CurrentUser().Phone;

        await mongo.GetCollection<DbTripIntent>()
            .InsertOneAsync(new DbTripIntent(id, tripIntent.Title, currentUser, tripIntent.From, tripIntent.To, tripIntent.GoTime, tripIntent.ReturnTime));

        return created;
    }

    public async Task Delete(string id)
    {
        await mongo.GetCollection<DbTripIntent>().DeleteOneAsync(ti => ti.Id == ObjectId.Parse(id));
    }

    public async Task<ImmutableList<TripIntent>> List()
    {
        var filter = FilterDefinition<DbTripIntent>.Empty;

        var builder = Builders<DbTripIntent>.Filter;

        var currentUser = currentContext.CurrentUser();

        if (!currentUser.IsAdmin)
        {
            var regex = new Regex(Regex.Escape(currentUser.Phone), RegexOptions.None);
            filter &= builder.Regex(x => x.User, new BsonRegularExpression(regex));
        }

        var result = (await mongo.GetCollection<DbTripIntent>().FindAsync(filter))
            .ToEnumerable()
            .Select(ToTripIntent)
            .ToImmutableList();

        return result;
    }

    public static TripIntent ToTripIntent(DbTripIntent dbTripIntent)
    {
        return new TripIntent(dbTripIntent.Id.ToString(), dbTripIntent.User,
            dbTripIntent.From, dbTripIntent.To,
            dbTripIntent.GoTime, dbTripIntent.ReturnTime);
    }
}