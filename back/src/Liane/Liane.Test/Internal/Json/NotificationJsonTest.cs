using System;
using System.Collections.Immutable;
using System.Text.Json;
using Liane.Api.Event;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class NotificationJsonTest
{
  private readonly JsonSerializerOptions options = JsonSerializerSettings.TestJsonOptions(false);

  [Test]
  public void ShouldSerializeBaseClass()
  {
    var e = new Event("id", ImmutableList<Recipient>.Empty, "augustin", DateTime.Parse("2023-03-03"), true, "lianeId", new LianeEvent.JoinRequest("Aurillac", "Medon", 2, false, "Hey !"));
    var actual = JsonSerializer.Serialize(e, options);
    Assert.AreEqual("{\"id\":\"id\",\"recipients\":[],\"createdBy\":\"augustin\",\"createdAt\":\"2023-03-03T00:00:00\",\"needsAnswer\":true,\"liane\":\"lianeId\",\"lianeEvent\":{\"type\":\"JoinRequest\",\"from\":\"Aurillac\",\"to\":\"Medon\",\"seats\":2,\"takeReturnTrip\":false,\"message\":\"Hey !\"}}", actual);
  }

  [Test]
  public void ShouldSerialize()
  {
    var e = new Event("id", ImmutableList<Recipient>.Empty, "augustin", DateTime.Parse("2023-03-03"), true, "lianeId", new LianeEvent.MemberHasLeft());
    var actual = JsonSerializer.Serialize(e, options);
    Assert.AreEqual("{\"id\":\"id\",\"recipients\":[],\"createdBy\":\"augustin\",\"createdAt\":\"2023-03-03T00:00:00\",\"needsAnswer\":true,\"liane\":\"lianeId\",\"lianeEvent\":{\"type\":\"MemberHasLeft\"}}", actual);
  }
}