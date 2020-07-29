using System.Collections.Immutable;

namespace Liane.Api.Matching
{
    public interface IUserService
    {
        public User? GetUser(string userId);
        public string? GetId(User user);
        public bool AddUser(string id, User user);
        public void EmptyUsersList();
        public bool IsPassenger(string userId);
        public bool IsDriver(string userId);

        public bool HasMatched(string passengerId);
        public Passenger? GetPassenger(string passengerId);
        public ImmutableList<Passenger> GetAllPassengers();
        public void EmptyPassengersList();

        public bool IsDriving(string driverId);
        public Driver? GetDriver(string driverId);
        public ImmutableList<Driver> GetAllDrivers();
        public void EmptyDriversList();
    }
}