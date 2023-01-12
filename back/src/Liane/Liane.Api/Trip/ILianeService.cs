using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Trip;

public interface ILianeService
{
    Task<Liane> Get(string id);
    
    Task<ImmutableList<Liane>> List();
    
    Task<Liane> Create(LianeRequest lianeRequest);
    

}