using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Matching;

namespace Liane.Service.Internal.Matching
{
    public class UserServiceImpl : IUserService
    {
        private ImmutableDictionary<string, User> users = ImmutableDictionary<string, User>.Empty;


        public User? GetUser(string userId)
        {
            return null;
        }

        public string? GetId(User user)
        {
            return users.ContainsValue(user) ? users.First(u => u.Value.Equals(user)).Key : null;
        }

        public bool IsPassenger(string userId)
        {
            var user = GetUser(userId);
            return user is Passenger;
        }

        public bool IsDriver(string userId)
        {
            var user = GetUser(userId);
            return user is Driver;
        }

        public bool AddUser(string id, User user)
        {
            if (users.ContainsKey(id))
                return false;
            users = users.Add(id, user);
            return true;
        }

        public void EmptyUsersList()
        {
            users = ImmutableDictionary<string, User>.Empty;
        }
        
        
        public bool HasMatched(string passengerId)
        {
            return false;
        }
        
        public Passenger? GetPassenger(string passengerId)
        {
            if (users.TryGetValue(passengerId, out var user))
            {
                if (user is Passenger passenger)
                    return passenger;
            }

            ;
            return null;
        }

        public ImmutableList<Passenger> GetAllPassengers()
        {
            ImmutableList<Passenger> result = ImmutableList<Passenger>.Empty;
            foreach (var (_, user) in users)
            {
                if (user is Passenger p)
                    result = result.Add(p);
            }

            return result;
        }

        public void EmptyPassengersList()
        {
            users = users.Where(user => user is Driver).ToImmutableDictionary();
        }

        public bool IsDriving(string driverId)
        {
            return false;
        }
        
        public Driver? GetDriver(string driverId)
        {
            if (users.TryGetValue(driverId, out var user))
            {
                if (user is Driver driver)
                    return driver;
            }

            ;
            return null;
        }

        public ImmutableList<Driver> GetAllDrivers()
        {
            ImmutableList<Driver> result = ImmutableList<Driver>.Empty;
            foreach (var (_, user) in users)
            {
                if (user is Driver p)
                    result = result.Add(p);
            }

            return result;
        }

        public void EmptyDriversList()
        {
            users = users.Where(user => user is Passenger).ToImmutableDictionary();
        }
    }
}