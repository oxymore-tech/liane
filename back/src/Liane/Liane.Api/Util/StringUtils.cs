using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Text;

namespace Liane.Api.Util;

public static class StringUtils
{
    public static string ToString<T>(T t)
    {
        var builder = new ToStringBuilder<T>(t);
        foreach (var property in typeof(T).GetProperties()) builder.Append(property);

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
                if (hasNext) stringBuilder.Append(", ");
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