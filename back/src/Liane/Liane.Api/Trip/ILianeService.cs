using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Liane;

public interface ILianeService
{
    Task<ImmutableList<UserLianeResponse>> List();
    
    Task<UserLianeResponse> Create(LianeRequest lianeRequest);
    

}