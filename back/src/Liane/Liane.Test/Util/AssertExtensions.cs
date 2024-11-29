using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using DeepEqual;
using DeepEqual.Syntax;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using NUnit.Framework;

namespace Liane.Test.Util;

public sealed class DateTimeComparison : IComparison
{
  public bool CanCompare(Type type1, Type type2)
  {
    return type1 == typeof(DateTime) && type2 == typeof(DateTime);
  }

  public (ComparisonResult result, IComparisonContext context) Compare(IComparisonContext context, object x, object y)
  {
    if (x is not DateTime d1)
    {
      return (ComparisonResult.Fail, context);
    }

    if (y is not DateTime d2)
    {
      return (ComparisonResult.Fail, context);
    }

    return Math.Abs((d1 - d2).TotalMilliseconds) < 1000
      ? (ComparisonResult.Pass, context)
      : (ComparisonResult.Fail, context);
  }
}

public static class AssertExtensions
{
  public static void AreRefEquivalent<T>(this IEnumerable<string?> expected, IEnumerable<T> actual)
    where T : class, IIdentity<string>
  {
    AreRefEquivalent(expected.FilterSelect(r => (Ref<T>)r), actual.FilterSelect(a => (Ref<T>?)a.Id));
  }

  public static void AssertDeepEqual<T>(this IEnumerable<T> actual, params T[] expected)
  {
    actual.WithDeepEqual(expected)
      .WithCustomComparison(new DateTimeComparison())
      .Assert();
  }

  public static void AssertDeepEqual<T>(this T actual, T expected)
  {
    actual.WithDeepEqual(expected)
      .WithCustomComparison(new DateTimeComparison())
      .Assert();
  }

  public static void AreRefEquivalent<T>(this IEnumerable<Ref<T>?> expected, IEnumerable<Ref<T>> actual)
    where T : class, IIdentity<string>
  {
    AreRefEquivalent(expected.FilterSelect(r => r?.ToString()), actual);
  }

  public static void AreRefEquivalent<T>(this IEnumerable<string?> expected, IEnumerable<Ref<T>> actual)
    where T : class, IIdentity<string>
  {
    CollectionAssert.AreEquivalent(expected.FilterSelect(r => r?.ToString()), actual.Select(r => r.ToString()));
  }

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