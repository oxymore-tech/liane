using System;
using System.IO;
using System.Reflection;
using System.Text;
using NUnit.Framework;

namespace Liane.Test.Util;

public static class AssertExtensions
{
  public static Stream ReadTestResource(string expectedFile, Assembly assembly)
  {
    var file = expectedFile.Replace("/", ".");
    var stream = assembly.GetManifestResourceStream($"{assembly.GetName().Name}.Resources.{file}");
    if (stream == null)
    {
      throw new AssertionException($"Unable to find {expectedFile} in assembly {assembly.GetName().Name}");
    }

    return stream;
  }

  public static string ReadTestResource(string expectedFile)
  {
    using var stream = ReadTestResource(expectedFile, Assembly.GetCallingAssembly());
    using var sr = new StreamReader(stream, Encoding.UTF8);
    return sr.ReadToEnd();
  }

  private const int PrecisionInMilliseconds = 1000;

  public static void AreMongoEquals(DateTime expected, DateTime actual)
  {
    Assert.IsTrue(Math.Abs((expected - actual).TotalMilliseconds) < PrecisionInMilliseconds);
  }
}