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
  public void ShouldSerialize()
  {
    var e = new Notification.Event("id", "augustin", DateTime.Parse("2023-03-03"), ImmutableList<Recipient>.Empty, ImmutableHashSet.Create(Answer.Accept, Answer.Reject),
      "Titre", "Augustin a quitté la liane",
      new LianeEvent.MemberHasLeft("6408a644437b60cfd3b15874", "augustin"));
    var actual = JsonSerializer.Serialize(e, options);
    Assert.AreEqual(
      "{\"id\":\"id\",\"sender\":\"augustin\",\"sentAt\":\"2023-03-03T00:00:00\",\"recipients\":[],\"answers\":[\"Accept\",\"Reject\"],\"title\":\"Titre\",\"message\":\"Augustin a quitt\\u00E9 la liane\",\"payload\":{\"_t\":\"MemberHasLeft\",\"liane\":\"6408a644437b60cfd3b15874\",\"member\":\"augustin\"}}",
      actual);
  }

  [Test]
  public void ShouldSerializeMemberPing()
  {
    var actual = JsonSerializer.Serialize(new LianeEvent.MemberPing("XXXX", "augustin", TimeSpan.FromMinutes(15), null), options);
    Assert.AreEqual(
      "{\"liane\":\"XXXX\",\"member\":\"augustin\",\"delay\":\"00:15:00\",\"coordinate\":null}",
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