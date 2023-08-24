using System.Threading.Tasks;

namespace Liane.Api.Trip;

public interface IRallyingPointGenerator
{
  Task Generate();
}