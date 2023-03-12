using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;

namespace Liane.Api.Util;

public static class StringUtils
{
    private static readonly Regex NonAlpha = new("([^A-Za-z0-9])+");
    private static readonly Regex CaseChanging = new(@"([a-z0-9])([A-Z])");

    public static string ToSnakeCase(this string value, char separator = '_')
    {
        var titleCase = ToTitleCase(value).Replace(' ', separator);
        return titleCase.ToLowerInvariant();
    }
    
    public static string ToTinyName(this string value)
    {
      var titleCase = string.Join("", ToTitleCase(value).Split().Select(w => w[0]));
      return titleCase.ToLowerInvariant();
    }

    public static string ToTitleCase(this string value)
    {
        var replace1 = CaseChanging.Replace(value, "$1 $2");
        var replace = NonAlpha.Replace(replace1, " ");
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(replace);
    }

    public static string NormalizeToCamelCase(this string value)
    {
        var titleCase = ToTitleCase(value).Replace(" ", "");
        return char.ToLowerInvariant(titleCase[0]) + titleCase[1..];
    }

    public static string Uncapitalize(this string value)
    {
        if (value.Length == 0)
        {
            return value;
        }

        var first = value[0];
        if (char.IsLower(first))
        {
            return value;
        }

        var c = char.ToLowerInvariant(first);

        if (value.Length == 1)
        {
            return c.ToString();
        }

        return c + value[1..];
    }
        
    public static string Capitalize(this string value)
    {
        if (value.Length == 0)
        {
            return value;
        }

        var first = value[0];
        if (char.IsUpper(first))
        {
            return value;
        }

        var c = char.ToUpperInvariant(first);

        if (value.Length == 1)
        {
            return c.ToString();
        }

        return c + value[1..];
    }

    public static string ToString<T>(T t)
    {
        var builder = new ToStringBuilder<T>(t);
        foreach (var property in typeof(T).GetProperties())
        {
            builder.Append(property);
        }

        return builder.ToString();
    }
}

public sealed class ToStringBuilder<T>
{
    private readonly T obj;
    private readonly Type objType;
    private readonly List<string> properties;

    public ToStringBuilder(T obj)
    {
        this.obj = obj;
        objType = obj!.GetType();
        properties = new List<string>();
    }

    public void Append(PropertyInfo propertyInfo)
    {
        var propertyName = propertyInfo.Name;

        var value = propertyInfo.GetValue(obj);

        if (value is ICollection e)
        {
            var stringBuilder = new StringBuilder();
            var enumerator = e.GetEnumerator();
            var hasNext = enumerator.MoveNext();
            while (hasNext)
            {
                stringBuilder.Append(enumerator.Current);
                hasNext = enumerator.MoveNext();
                if (hasNext)
                {
                    stringBuilder.Append(", ");
                }
            }

            properties.Add($"{propertyName}: [{stringBuilder}]");
        }
        else
        {
            properties.Add($"{propertyName}: {value}");
        }
    }

    public override string ToString()
    {
        return objType.Name + "{" + string.Join(", ", properties) + "}";
    }
}