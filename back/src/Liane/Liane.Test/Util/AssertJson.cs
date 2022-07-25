using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.Json;
using NUnit.Framework;

namespace Liane.Test.Util;

public static class AssertJson
{
    public static void AreEqual(string expectedJsonFile, object actual)
    {
        var assembly = Assembly.GetCallingAssembly();
        using var stream = AssertExtensions.ReadTestResource(expectedJsonFile, assembly);

        var expectedJson = new StreamReader(stream, Encoding.UTF8).ReadToEnd();
        var options = new JsonSerializerOptions {WriteIndented = true};
        var serializeObject = JsonSerializer.Serialize(actual, options);
        try
        {
            Assert.AreEqual(expectedJson, serializeObject);
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
        return JsonSerializer.Deserialize<T>(expectedJson)!;
    }
}