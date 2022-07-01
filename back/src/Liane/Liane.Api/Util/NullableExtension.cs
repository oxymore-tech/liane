using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace Liane.Api.Util;

public static class NullableExtension
{
    public static TTo? GetOrDefault<TFrom, TTo>(this TFrom? from, Func<TFrom, TTo?> selector)
        where TFrom : class
        where TTo : class
    {
        return from == null ? default : selector(from);
    }

    public static TTo? GetOrDefault<TFrom, TTo>(this TFrom? from, Func<TFrom, TTo?> selector)
        where TFrom : struct
        where TTo : class
    {
        return from == null ? default : selector(from.Value);
    }

    public static async Task<TTo?> GetOrDefault<TFrom, TTo>(this TFrom? from, Func<TFrom, Task<TTo>> selector)
        where TFrom : struct
        where TTo : class
    {
        return from == null ? default : await selector(from.Value);
    }

    public static TTo? Map<TFrom, TTo>(this TFrom? from, Func<TFrom, TTo?> selector)
        where TFrom : class
        where TTo : class
    {
        return from == null ? default : selector(from);
    }

    public static TTo? Map<TFrom, TTo>(this TFrom? from, Func<TFrom, TTo?> selector)
        where TFrom : struct
        where TTo : class
    {
        return from.HasValue ? selector(from.Value) : default;
    }

    public static bool IsNullable(this PropertyInfo property)
    {
        var enclosingType = property.DeclaringType;
        if (enclosingType == null) throw new ArgumentException("Property must have a DeclaringType");

        var nullable = property.CustomAttributes
            .FirstOrDefault(x => x.AttributeType.FullName == "System.Runtime.CompilerServices.NullableAttribute");
        if (nullable != null && nullable.ConstructorArguments.Count == 1)
        {
            var attributeArgument = nullable.ConstructorArguments[0];
            if (attributeArgument.ArgumentType == typeof(byte[]))
            {
                var args = (ReadOnlyCollection<CustomAttributeTypedArgument>) attributeArgument.Value!;
                if (args.Count > 0 && args[0].ArgumentType == typeof(byte)) return (byte) args[0].Value! == 2;
            }
            else if (attributeArgument.ArgumentType == typeof(byte))
            {
                return (byte) attributeArgument.Value! == 2;
            }
        }

        var context = enclosingType.CustomAttributes
            .FirstOrDefault(x =>
                x.AttributeType.FullName == "System.Runtime.CompilerServices.NullableContextAttribute");
        if (context != null &&
            context.ConstructorArguments.Count == 1 &&
            context.ConstructorArguments[0].ArgumentType == typeof(byte))
            return (byte) context.ConstructorArguments[0].Value! == 2;

        // Couldn't find a suitable attribute
        return false;
    }
}