using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Test.Mock;

public class RallyingPointServiceMock 
{
  public static IRallyingPointService CreateMockRallyingPointService(IMongoDatabase? db = null)
  {
    var mock = new Moq.Mock<IRallyingPointService>
    {
      CallBase = true
    };
    mock.Setup(m => m.Get(Moq.It.IsAny<Ref<RallyingPoint>>()))
      .Returns<Ref<RallyingPoint>>(async reference =>
      {
        var value = (RallyingPoint?)reference;
        if (value is null)
        {
          if (db is not null)
          {
            return (await db.GetCollection<RallyingPoint>().FindAsync(r => r.Id == reference.Id)).First();
          }
          throw new ResourceNotFoundException($"Ref<RallyingPoint> '{reference.Id}' has no value");
        }

        return value;
      });
    return mock.Object;

  }
  
}