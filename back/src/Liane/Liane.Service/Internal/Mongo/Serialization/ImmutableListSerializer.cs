using System.Collections.Immutable;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

internal sealed class ImmutableListSerializer<TValue> : EnumerableInterfaceImplementerSerializerBase<ImmutableList<TValue>, TValue>
{
    protected override object CreateAccumulator() => ImmutableList.CreateBuilder<TValue>();

    protected override ImmutableList<TValue> FinalizeResult(object accumulator) => ((ImmutableList<TValue>.Builder)accumulator).ToImmutable();
}