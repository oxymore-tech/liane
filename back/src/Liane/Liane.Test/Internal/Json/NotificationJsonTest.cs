using System;
using System.Text.Json;
using Liane.Api.Notification;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

public class NotificationJsonTest
{
  private readonly JsonSerializerOptions options = new()
  {
    PropertyNamingPolicy = new SnakeCaseNamingPolicy(), 
    PropertyNameCaseInsensitive = true, 
    Converters = { new RefJsonConverterFactory(), new NotificationJsonConverter() }, 
    TypeInfoResolver = new PolymorphicTypeResolver(),
  };
  
  
  [Test]
  public void ShouldSerialize()
  {
    var notification = new BaseNotification.Notification<string>("id", DateTime.Parse("2023-03-03"), "ok");
    var actual = JsonSerializer.Serialize<BaseNotification>(notification, options);
    Assert.AreEqual("{\"id\":\"id\",\"created_at\":\"2023-03-03T00:00:00\",\"type\":\"String\",\"event\":\"ok\"}", actual);
  }
}