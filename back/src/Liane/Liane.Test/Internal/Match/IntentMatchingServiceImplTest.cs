using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Match;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Match;
using Moq;
using NUnit.Framework;

namespace Liane.Test.Internal.Match;

[TestFixture]
public sealed class IntentMatchingServiceImplTest
{
    [Test]
    public async Task CrossRoadsGroupIntentsTest()
    {
        var createdAt = DateTime.Parse("2010-08-20T15:00:00Z");

        var blanc = new TripIntent("blanc1", "blanc1", CantalPoints.Laroquebrou, CantalPoints.Arpajon, GetTime("09:00"), GetTime("17:00"), "Augustin", createdAt);
        var vert = new TripIntent("vert2", "vert2", CantalPoints.Saintpaul, CantalPoints.Aurillac, GetTime("09:00"), GetTime("17:00"), "Béatrice", createdAt);
        var jaune = new TripIntent("jaune3", "jaune3", CantalPoints.Ytrac, CantalPoints.Vic, GetTime("09:00"), GetTime("17:00"), "Mathilde", createdAt);
        var rose = new TripIntent("rose4", "rose4", CantalPoints.Sansac, CantalPoints.Saintsimon, GetTime("09:00"), GetTime("17:00"), "Lucile", createdAt);
        var rouge = new TripIntent("rouge5", "rouge5", CantalPoints.Reilhac, CantalPoints.Vic, GetTime("09:00"), GetTime("17:00"), "Jean-Baptiste", createdAt);
        var bleu = new TripIntent("bleu6", "bleu6", CantalPoints.Naucelles, CantalPoints.Aurillac, GetTime("09:00"), GetTime("17:00"), "Aurélia", createdAt);
        var noir = new TripIntent("noir7", "noir7", CantalPoints.Arpajon, CantalPoints.Vic, GetTime("09:00"), GetTime("17:00"), "Manfred", createdAt);

        var tripIntentService = new Mock<ITripIntentService>();
        tripIntentService.Setup(s => s.List())
            .ReturnsAsync(ImmutableList.Create(blanc, vert, jaune, rose, rouge, bleu, noir));

        var currentContext = new Mock<ICurrentContext>();
        currentContext.Setup(c => c.CurrentUser())
            .Returns(new AuthUser("0000000000", "Augustin", false));

        var tested = new IntentMatchingServiceImpl(currentContext.Object, RoutingServiceMock.Object(), tripIntentService.Object);

        var actual = await tested.Match();

        CollectionAssert.AreEquivalent(ImmutableList.Create(
            new TripIntentMatch(blanc, blanc.From, blanc.To, ImmutableList.Create(
                new Api.Match.Match("Béatrice", CantalPoints.Saintpaul, CantalPoints.Aurillac),
                new Api.Match.Match("Jean-Baptiste", CantalPoints.Aurillac, CantalPoints.Arpajon)
            ))
        ), actual);
    }

    private static TimeOnly GetTime(string timeStr)
    {
        return TimeOnly.ParseExact(timeStr, "HH:mm", null);
    }
}