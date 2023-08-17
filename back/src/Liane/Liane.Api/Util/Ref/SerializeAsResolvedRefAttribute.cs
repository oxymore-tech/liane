using System;

namespace Liane.Api.Util.Ref;

[AttributeUsage(AttributeTargets.Parameter | AttributeTargets.Property)]
public class SerializeAsResolvedRefAttribute : Attribute
{
}