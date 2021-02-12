using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Matching
{
    public interface IUserService
    {
        Task<Driver> GetDriver(string userId);
        Task<ImmutableList<Passenger>> GetAllPassengers();
        Task<string?> GetId(User.User user);
    }
}