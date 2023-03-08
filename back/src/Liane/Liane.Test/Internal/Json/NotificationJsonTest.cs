using System;
using System.Text.Json;
using Liane.Api.Notification;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

public class NotificationJsonTest
{
  private readonly JsonSerializerOptions options;

  public NotificationJsonTest()
  {
    var options = new JsonSerializerOptions();
    JsonSerializerSettings.ConfigureOptions(options);
    this.options = options;
  }

  [Test]
  public void ShouldSerializeBaseClass()
  {
    var notification = new NotificationPayload.WithEvent<string>("id", DateTime.Parse("2023-03-03"), "ok");
    var actual = JsonSerializer.Serialize<NotificationPayload>(notification, options);
    Assert.AreEqual("{\"id\":\"id\",\"createdAt\":\"2023-03-03T00:00:00\",\"type\":\"String\",\"event\":\"ok\"}", actual);
  }
  
    [Test]
    public void ShouldSerialize()
    {
      var notification = new NotificationPayload.WithEvent<string>("id", DateTime.Parse("2023-03-03"), "ok");
      var actual = JsonSerializer.Serialize(notification, options);
      Assert.AreEqual("{\"event\":\"ok\",\"type\":\"String\",\"id\":\"id\",\"seen\":false,\"createdAt\":\"2023-03-03T00:00:00\"}", actual);
    }
}