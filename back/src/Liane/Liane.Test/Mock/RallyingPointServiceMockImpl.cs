using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;

namespace Liane.Test.Mock;

public class RallyingPointServiceMock 
{
  public static IRallyingPointService CreateMockRallyingPointService()
  {
    var mock = new Moq.Mock<IRallyingPointService>
    {
      CallBase = true
    };
    mock.Setup(m => m.Get(Moq.It.IsAny<Ref<RallyingPoint>>()))
      .Returns<Ref<RallyingPoint>>(reference =>
      {
        var value = (RallyingPoint?)reference;
        if (value is null)
        {
          throw new ResourceNotFoundException($"Ref<RallyingPoint> '{reference.Id}' has no value");
        }

        return Task.FromResult(value);
      });
    return mock.Object;

  }
  
}