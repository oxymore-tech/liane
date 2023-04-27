using System.Collections.Immutable;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

internal sealed class ImmutableHashSetSerializer<TValue> : EnumerableInterfaceImplementerSerializerBase<ImmutableHashSet<TValue>, TValue>
{
  protected override object CreateAccumulator() => ImmutableHashSet.CreateBuilder<TValue>();

  protected override ImmutableHashSet<TValue> FinalizeResult(object accumulator) => ((ImmutableHashSet<TValue>.Builder)accumulator).ToImmutable();
}