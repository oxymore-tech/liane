using System.Collections.Generic;
using Liane.Api.TripIntent;
using NUnit.Framework;

namespace Liane.Test.GroupTripIntents;

[TestFixture]
public sealed class GroupTripIntentTest
{
    private List<TripIntent> cantalIntents;

    public GroupTripIntentTest()
    {
        cantalIntents = TripIntentStub.GetTripIntents();
    }
    
    [Test]
    public void GroupIntentsTest()
    {
        var intentGroups = new List<List<TripIntent>>();
        // intentGroups = MatchTripIntent(cantalIntents);
        Assert.Equals(intentGroups.Count, 4);
    }
    
}