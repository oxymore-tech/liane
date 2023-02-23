using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;

namespace Liane.Service.Internal.Mongo.Serialization;

public sealed class IdSerializationConvention : ConventionBase, IMemberMapConvention
{
  /// <inheritdoc/>
  public void Apply(BsonMemberMap memberMap)
  {
    if (memberMap != memberMap.ClassMap.IdMemberMap)
    {
      return;
    }

    if (memberMap.MemberType != typeof(string))
    {
      return;
    }

    var defaultStringSerializer = BsonSerializer.LookupSerializer(typeof(string));
    if (memberMap.GetSerializer() != defaultStringSerializer)
    {
      return;
    }

    if (memberMap.IdGenerator != null)
    {
      return;
    }

    memberMap.SetSerializer(new String2ObjectIdBsonSerializer());
    //  memberMap.SetIdGenerator(StringObjectIdGenerator.Instance);
  }
}