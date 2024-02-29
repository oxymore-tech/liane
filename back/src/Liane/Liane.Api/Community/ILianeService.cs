using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Community;

public interface ILianeService
{
  Task<ImmutableList<LianeMatch>> List();
  Task<LianeRequest> Create(LianeRequest request);
}