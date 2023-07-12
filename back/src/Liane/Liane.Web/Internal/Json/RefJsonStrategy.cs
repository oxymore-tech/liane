using System;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Liane.Api.Util.Ref;

namespace Liane.Web.Internal.Json;

public class RefJsonStrategy
{
  
  private static Ref<T>? SetResolvedState<T>(Ref<T> reference, bool expectResolved) where T: class, IIdentity
  {
    if (!expectResolved)
    {
      return reference.Id; 
    }
    else if (reference is not Ref<T>.Resolved)
    {
      return null;
    }
    
    return reference;
  }

  public static Action<JsonTypeInfo> CreateRefResolutionModifier(JsonNamingPolicy namingStrategy)
  {
    return typeInfo =>
    {
      var refProperties = typeInfo.Type.GetProperties()
        .Where(p => p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(Ref<>)).ToArray();
      if (refProperties.Length == 0) return;

      // Map properties name to their json name
      var propsMap = refProperties.ToDictionary<PropertyInfo, string>(p => namingStrategy.ConvertName(p.Name));
      var targetProps = typeInfo.Properties.Where(p => propsMap.ContainsKey(p.Name));
      var refConverterMethod = typeof(RefJsonStrategy).GetMethod(nameof(SetResolvedState), BindingFlags.NonPublic | BindingFlags.Static)!;


      foreach (var propertyInfo in targetProps)
      {
        var targetProperty = propsMap[propertyInfo.Name];
        
        if (propertyInfo.Get is null || targetProperty.PropertyType != propertyInfo.PropertyType)
          continue;

        // Check if ref has attribute
        var serializationAttributes = propertyInfo.AttributeProvider?.GetCustomAttributes(typeof(SerializeAsResolvedRefAttribute), false);
        var attribute = serializationAttributes?.Length == 1 ? (SerializeAsResolvedRefAttribute)serializationAttributes[0] : null;
        var serializeAsResolved = attribute is not null;

        // Get ref type
        var refType = propertyInfo.PropertyType.GenericTypeArguments[0];
        
          propertyInfo.Get = serializedObject =>
          {
            // Update serialized value
            var propertyRefValue = targetProperty.GetValue(serializedObject);
            if (propertyRefValue is null) return null;
            var newRefPropertyValue = refConverterMethod.MakeGenericMethod(refType)
              .Invoke(null, new[] { propertyRefValue, serializeAsResolved });
            if (newRefPropertyValue is null)
            {
              throw new ArgumentException($"Expected resolved Ref {propertyRefValue}");
            } 
            return newRefPropertyValue;
          };
        

      }


    };
  }

  
}