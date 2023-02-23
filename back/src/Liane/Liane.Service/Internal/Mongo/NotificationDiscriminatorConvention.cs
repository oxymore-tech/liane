using System;
using Liane.Service.Internal.Notification;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization.Conventions;

namespace Liane.Service.Internal.Mongo;

public class NotificationDiscriminatorConvention: IDiscriminatorConvention
  {
    public string ElementName => "Type";

    public Type GetActualType(IBsonReader bsonReader, Type nominalType)
      {
        if(nominalType!=typeof(BaseNotificationDb))
          throw new Exception("Cannot use NotificationDiscriminator for type " + nominalType);

        var ret = nominalType;

        var bookmark = bsonReader.GetBookmark();
        bsonReader.ReadStartDocument();
        if (bsonReader.FindElement(ElementName))
        {
          var value = bsonReader.ReadString();

          ret = Type.GetType(value);

          if(ret==null)
            throw new Exception("Could not find type " + value);

          if(!ret.IsSubclassOf(typeof(BaseNotificationDb)))
            throw new Exception(value + " does not inherit from BaseNotificationDb.");
        }

        bsonReader.ReturnToBookmark(bookmark);

        return ret;
      }

      public BsonValue GetDiscriminator(Type nominalType, Type actualType)
      {
        if (nominalType != typeof(BaseNotificationDb) && !nominalType.IsSubclassOf(typeof(BaseNotificationDb)))
          throw new Exception("Cannot use NotificationDiscriminator for type " + nominalType);

        return actualType.FullName;
      }
    }
  
