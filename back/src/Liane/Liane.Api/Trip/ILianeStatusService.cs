using System.Threading.Tasks;

namespace Liane.Api.Trip;

public interface ILianeStatusService
{
  Task<LianeStatus> GetStatus(string id);
}