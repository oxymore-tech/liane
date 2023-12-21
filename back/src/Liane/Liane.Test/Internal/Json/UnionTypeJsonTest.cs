using System;
using System.Collections.Immutable;
using System.Text.Json;
using DeepEqual.Syntax;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class UnionTypeJsonTest
{
  private readonly JsonSerializerOptions options = JsonSerializerSettings.TestJsonOptions(false);

  [Test]
  public void ShouldSerializeMatchType()
  {
    var match = new Api.Trip.Match.Compatible(new Delta(0, 0), LabeledPositions.QuezacParking.Id!, LabeledPositions.BalsiegeParkingEglise.Id!, ImmutableList<WayPoint>.Empty);
    var json = JsonSerializer.Serialize<Api.Trip.Match>(match, options);
    Assert.IsTrue(json.Contains("\"type\":\"Compatible\""));
    var actual = JsonSerializer.Deserialize<Api.Trip.Match>(json, options);
    match.WithDeepEqual(actual)
      .Assert();
  }

  [Test]
  public void ShouldDeserializeLianeEvent()
  {
    var lianeEvent = new LianeEvent.MemberHasLeft("lianeId1", "augustin");
    var actual = JsonSerializer.Deserialize<LianeEvent>("{\"liane\":\"lianeId1\",\"Member\": \"augustin\",\"type\":\"MemberHasLeft\"}", options);
    Assert.AreEqual(lianeEvent, actual);
  }

  [Test]
  public void ShouldFailToDeserializeLianeEventWithMissingTypeInfo()
  {
    Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<LianeEvent>("{\"liane\":\"lianeId1\",\"Member\": \"augustin\"}", options));
  }

  [Test]
  public void ShouldDeserializeMemberHasLeft()
  {
    var lianeEvent = new LianeEvent.MemberHasLeft("lianeId1", "augustin");
    var actual = JsonSerializer.Deserialize<LianeEvent.MemberHasLeft>("{\"liane\":\"lianeId1\",\"Member\": \"augustin\"}", options);
    Assert.AreEqual(lianeEvent, actual);
  }

  [Test]
  public void ShouldSerializeFromGenericTypeWithTypeInfo()
  {
    var lianeEvent = new LianeEvent.MemberHasLeft("lianeId1", "augustin");
    var actual = JsonSerializer.Serialize<LianeEvent>(lianeEvent, options);
    Assert.AreEqual("{\"type\":\"MemberHasLeft\",\"liane\":\"lianeId1\",\"member\":\"augustin\"}", actual);
  }

  [Test]
  public void ShouldSerializeTypeInfo()
  {
    var lianeEvent = new LianeEvent.MemberHasLeft("lianeId1", "augustin");
    var actual = JsonSerializer.Serialize(lianeEvent, options);
    Assert.AreEqual("{\"type\":\"MemberHasLeft\",\"liane\":\"lianeId1\",\"member\":\"augustin\"}", actual);
  }

  [Test]
  public void ShouldSerializeNotification()
  {
    var notif = new Notification.Event("id", "userA", DateTime.Parse("2023-05-06T08:08:08Z").ToUniversalTime(), ImmutableList<Recipient>.Empty, ImmutableHashSet<Answer>.Empty, "title", "message", new LianeEvent.MemberAccepted("lianeId1", "augustin", "a", "b", 1, false));
    var actual = JsonSerializer.Serialize(notif, options);
    Console.Out.Write(actual);
    Assert.AreEqual("{\"type\":\"Event\",\"id\":\"id\",\"createdBy\":\"userA\",\"createdAt\":\"2023-05-06T08:08:08Z\",\"recipients\":[],\"answers\":[],\"title\":\"title\",\"message\":\"message\",\"payload\":{\"type\":\"MemberAccepted\",\"liane\":\"lianeId1\",\"member\":\"augustin\",\"from\":\"a\",\"to\":\"b\",\"seats\":1,\"takeReturnTrip\":false},\"seenAt\":null,\"uri\":\"liane://liane/lianeId1\"}", actual);
  }
  
  [Test]
  public void ShouldSerializeNotificationInfo()
  {
    var notif = new Notification.Info("id", "userA", DateTime.Parse("2023-05-06T08:08:08Z").ToUniversalTime(), ImmutableList<Recipient>.Empty, ImmutableHashSet<Answer>.Empty, "title", "message", "liane://liane/customUriTest");
    var actual = JsonSerializer.Serialize(notif, options);
    Console.Out.Write(actual);
    Assert.AreEqual("{\"type\":\"Info\",\"id\":\"id\",\"createdBy\":\"userA\",\"createdAt\":\"2023-05-06T08:08:08Z\",\"recipients\":[],\"answers\":[],\"title\":\"title\",\"message\":\"message\",\"uri\":\"liane://liane/customUriTest\",\"seenAt\":null}", actual);
  }

  [Test]
  public void ShouldSerializeConcrete1()
  {
    var test = new RootUnionType.Concrete1();
    var actual = JsonSerializer.Serialize(test, options);
    Assert.AreEqual("{\"type\":\"Concrete1\"}", actual);
  }

  [Test]
  public void ShouldDeserializeConcrete1()
  {
    var actual = JsonSerializer.Deserialize<RootUnionType>("{\"type\":\"Concrete1\"}", options);
    var expected = new RootUnionType.Concrete1();
    Assert.AreEqual(expected, actual);
  }

  [Test]
  public void ShouldSerializeConcrete2()
  {
    var test = new RootUnionType.Concrete2();
    var actual = JsonSerializer.Serialize(test, options);
    Assert.AreEqual("{\"type\":\"Concrete2\"}", actual);
  }

  [Test]
  public void ShouldDeserializeConcrete2()
  {
    var actual = JsonSerializer.Deserialize<RootUnionType>("{\"type\":\"Concrete2\"}", options);
    var expected = new RootUnionType.Concrete2();
    Assert.AreEqual(expected, actual);
  }

  [Test]
  public void ShouldDeserializeConcrete3WithDefaultValue()
  {
    var actual = JsonSerializer.Deserialize<RootUnionType>("{\"type\":\"Concrete3\"}", options);
    var expected = new RootUnionType.Concrete3();
    Assert.AreEqual(expected, actual);
    Assert.AreEqual(33, ((RootUnionType.Concrete3)actual!).Test);
  }

  [Test]
  public void ShouldDeserializeReminder()
  {
    var actual = JsonSerializer.Deserialize<Notification>(
      "{\"answers\": [], \"createdAt\": \"2023-08-10T14:11:29Z\", \"CreatedBy\": \"test\", \"id\": \"test\", \"message\": \"Bravo2 4\", \"payload\": {\"liane\": \"XX\", \"trip\":  []}, \"recipients\": [{\"answer\": null, \"seenAt\": null, \"user\": \"63f73936d3436d499d1075f6\"}], \"seenAt\": null, \"title\": \"Bravo 4\", \"type\": \"Reminder\"}",
      options);
    var expected = new Notification.Reminder("test", "test", DateTime.Parse("2023-08-10T14:11:29Z", null, System.Globalization.DateTimeStyles.RoundtripKind), ImmutableList.Create(new Recipient("63f73936d3436d499d1075f6")),
      ImmutableHashSet<Answer>.Empty, "Bravo 4", "Bravo2 4", new Reminder("XX", ImmutableList<WayPoint>.Empty, false));
    actual.WithDeepEqual(expected)
      .Assert();
  }

  [Union]
  internal abstract record RootUnionType
  {
    internal abstract record Abstract1 : RootUnionType;

    internal sealed record Concrete1 : RootUnionType;

    internal sealed record Concrete2 : Abstract1;

    internal sealed record Concrete3(int Test = 33) : Abstract1;
  }
}