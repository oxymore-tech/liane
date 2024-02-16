using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Community;

public interface ILianeService
{
  Task<ImmutableList<Liane>> List();
  Task<ImmutableList<Liane>> FindMatches();
  Task<Liane> Create(LianeQuery query);
}