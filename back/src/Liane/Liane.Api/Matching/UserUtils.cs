using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Matching
{
    public static class UserUtils
    {
        private static ImmutableDictionary<string, User> users = ImmutableDictionary<string, User>.Empty;


        public static User? GetUser(string userId)
        {
            return null;
        }

        public static string? GetId(User user)
        {
            return users.ContainsValue(user) ? users.First(u => u.Value.Equals(user)).Key : null;
        }

        public static bool IsPassenger(string userId)
        {
            var user = GetUser(userId);
            return user is Passenger;
        }

        public static bool IsDriver(string userId)
        {
            var user = GetUser(userId);
            return user is Driver;
        }

        public static bool AddUser(string id, User user)
        {
            if (users.ContainsKey(id))
                return false;
            users = users.Add(id, user);
            return true;
        }

        public static void EmptyUsersList()
        {
            users = ImmutableDictionary<string, User>.Empty;
        }


        public static bool HasMatched(string passengerId)
        {
            return false;
        }

        public static Passenger? GetPassenger(string passengerId)
        {
            if (users.TryGetValue(passengerId, out var user))
                if (user is Passenger passenger)
                    return passenger;

            return null;
        }

        public static ImmutableList<Passenger> GetAllPassengers()
        {
            ImmutableList<Passenger> result = ImmutableList<Passenger>.Empty;
            foreach (var (_, user) in users)
                if (user is Passenger p)
                    result = result.Add(p);

            return result;
        }

        public static void EmptyPassengersList()
        {
            users = users.Where(user => user is Driver).ToImmutableDictionary();
        }

        public static bool IsDriving(string driverId)
        {
            return false;
        }

        public static Driver? GetDriver(string driverId)
        {
            if (users.TryGetValue(driverId, out var user))
                if (user is Driver driver)
                    return driver;

            ;
            return null;
        }

        public static ImmutableList<Driver> GetAllDrivers()
        {
            ImmutableList<Driver> result = ImmutableList<Driver>.Empty;
            foreach (var (_, user) in users)
                if (user is Driver p)
                    result = result.Add(p);

            return result;
        }

        public static void EmptyDriversList()
        {
            users = users.Where(user => user is Passenger).ToImmutableDictionary();
        }
    }
}