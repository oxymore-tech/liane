using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Matching;

public interface IMatchingService
{
    Task<ImmutableList<PassengerProposal>> SearchPassengers(string userId);
    Task<ImmutableList<DriverProposal>> SearchDrivers(string userId);
}