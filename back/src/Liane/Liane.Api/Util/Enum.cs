using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Liane.Api.Util;

public abstract class Enum<T> where T : Enum<T>
{
    protected Enum(int id, string name)
    {
        Id = id;
        Name = name;
    }

    public int Id { get; }

    public string Name { get; }

    public override string ToString()
    {
        return Name;
    }

    public static T? ValueOf(string name)
    {
        return All().FirstOrDefault(e => e.Name.ToLower().Equals(name.ToLower()));
    }

    public static IEnumerable<T> All()
    {
        var type = typeof(T);
        return type
            .GetFields(BindingFlags.Public |
                       BindingFlags.Static |
                       BindingFlags.DeclaredOnly)
            .Where(info => info.FieldType == type)
            .Select(f => f.GetValue(null))
            .Cast<T>();
    }

    protected bool Equals(Enum<T> other)
    {
        return Equals(Id, other.Id);
    }

    public override bool Equals(object? obj)
    {
        if (ReferenceEquals(null, obj)) return false;
        if (ReferenceEquals(this, obj)) return true;
        return obj.GetType() == GetType() && Equals((Enum<T>) obj);
    }

    public override int GetHashCode()
    {
        return Id.GetHashCode();
    }

    public static bool operator ==(T? obj, Enum<T>? obj2)
    {
        return Equals(obj, obj2);
    }

    public static bool operator !=(T? obj, Enum<T>? obj2)
    {
        return !(obj == obj2);
    }
}