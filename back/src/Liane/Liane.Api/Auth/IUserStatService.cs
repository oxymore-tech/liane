using System.Threading.Tasks;

namespace Liane.Api.Auth;

public interface IUserStatService
{
  Task IncrementTotalTrips(string userId, int totalSavedEmissions);
  Task IncrementTotalCreatedTrips(string userId);
  Task IncrementTotalJoinedTrips(string userId);
}