using System;
using System.Collections.Immutable;
using System.Text.Json;
using Liane.Api.Event;
using Liane.Test.Util;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class LianeEventJsonTest
{
  private readonly JsonSerializerOptions options = JsonSerializerSettings.TestJsonOptions(false);

  [Test]
  public void ShouldSerializeBaseClass()
  {
    var e = new Event("id", ImmutableList<Recipient>.Empty, "augustin", DateTime.Parse("2023-03-03"), true,
      new LianeEvent.JoinRequest("6408a644437b60cfd3b15874", "Aurillac", "Medon", 2, false, "Hey !"));
    var actual = JsonSerializer.Serialize(e, options);
    Assert.AreEqual(
      "{\"id\":\"id\",\"recipients\":[],\"createdBy\":\"augustin\",\"createdAt\":\"2023-03-03T00:00:00\",\"needsAnswer\":true,\"lianeEvent\":{\"type\":\"JoinRequest\",\"liane\":\"6408a644437b60cfd3b15874\",\"from\":\"Aurillac\",\"to\":\"Medon\",\"seats\":2,\"takeReturnTrip\":false,\"message\":\"Hey !\"}}",
      actual);
  }
  
  [Test]
  public void ShouldSerialize()
  {
    var e = new Event("id", ImmutableList<Recipient>.Empty, "augustin", DateTime.Parse("2023-03-03"), true, new LianeEvent.MemberHasLeft("6408a644437b60cfd3b15874"));
    var actual = JsonSerializer.Serialize(e, options);
    Assert.AreEqual(
      "{\"id\":\"id\",\"recipients\":[],\"createdBy\":\"augustin\",\"createdAt\":\"2023-03-03T00:00:00\",\"needsAnswer\":true,\"lianeEvent\":{\"type\":\"MemberHasLeft\",\"liane\":\"6408a644437b60cfd3b15874\"}}",
      actual);
  }

  [Test]
  public void ShouldDeserialize()
  {
    var joinRequest = new LianeEvent.JoinRequest("6408a644437b60cfd3b15874", "Aurillac", "Medon", 2, false, "Hey !");
    var actual = JsonSerializer.Deserialize<LianeEvent>(AssertExtensions.ReadTestResource("join-request.json"), options);
    Assert.AreEqual(joinRequest, actual);
  }
}