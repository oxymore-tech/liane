using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.More;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Util;

public static class AssertJson
{
  private static readonly JsonSerializerOptions JsonOptions = JsonSerializerSettings.TestJsonOptions();

  public static void AreEqual(string expectedJsonFile, object actual)
  {
    var assembly = Assembly.GetCallingAssembly();
    using var stream = AssertExtensions.ReadTestResource(expectedJsonFile, assembly);

    var expectedJson = new StreamReader(stream, Encoding.UTF8).ReadToEnd();
    var serializeObject = JsonSerializer.Serialize(actual, JsonOptions);
    try
    {
      var expectedJsonNode = JsonSerializer.Deserialize<JsonNode>(expectedJson, JsonOptions);
      var actualJsonNode = JsonSerializer.Deserialize<JsonNode>(serializeObject, JsonOptions);
      expectedJsonNode.IsEquivalentTo(actualJsonNode);
    }
    catch (AssertionException)
    {
      Console.Write(serializeObject);
    }
  }

  public static T ReadJson<T>(string jsonFile)
  {
    var assembly = Assembly.GetCallingAssembly();
    using var stream = AssertExtensions.ReadTestResource(jsonFile, assembly);
    var expectedJson = new StreamReader(stream, Encoding.UTF8).ReadToEnd();
    return JsonSerializer.Deserialize<T>(expectedJson, JsonOptions)!;
  }
}