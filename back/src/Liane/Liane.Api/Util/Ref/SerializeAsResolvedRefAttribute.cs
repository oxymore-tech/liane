using System;

namespace Liane.Api.Util.Ref;

[AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
public class SerializeAsResolvedRefAttribute : Attribute
{

}