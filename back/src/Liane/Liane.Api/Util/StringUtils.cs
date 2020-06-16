using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;

namespace Liane.Api.Util
{
    public static class StringUtils
    {
        private static readonly Regex CodePattern = new Regex("[A-Za-z0-9]+");

        public static string ToCamelCase(string value)
        {
            var pascalCase = ToPascalCase(value);
            if (pascalCase == string.Empty) return string.Empty;

            return char.ToLowerInvariant(pascalCase[0]) + pascalCase.Substring(1);
        }

        public static string ToPascalCase(string value)
        {
            return string.Join("", CodePattern.Matches(value)
                .Where(m => m != null)
                .Select(m => char.ToUpperInvariant(m.Value[0]) + m.Value.Substring(1).ToLowerInvariant())
            );
        }

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
}