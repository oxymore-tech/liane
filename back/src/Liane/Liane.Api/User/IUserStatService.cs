using System.Threading.Tasks;

namespace Liane.Api.User;

public interface IUserStatService
{
  Task IncrementTotalTrips(string userId, int totalSavedEmissions);
  Task IncrementTotalCreatedTrips(string userId);
}