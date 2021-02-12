using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Matching;
using Liane.Api.Util.Exception;

namespace Liane.Service.Internal.Matching
{
    public sealed class UserServiceImpl : IUserService
    {
        private ImmutableDictionary<string, Api.User.User> users = ImmutableDictionary<string, Api.User.User>.Empty;

        public Api.User.User? GetUser(string userId)
        {
            return null;
        }

        public Task<string?> GetId(Api.User.User user)
        {
            return Task.FromResult(
                users.ContainsValue(user) ? users.First(u => u.Value.Equals(user)).Key : null
            );
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

        public bool AddUser(string id, Api.User.User user)
        {
            if (users.ContainsKey(id))
                return false;
            users = users.Add(id, user);
            return true;
        }

        public void EmptyUsersList()
        {
            users = ImmutableDictionary<string, Api.User.User>.Empty;
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
                {
                    return passenger;
                }
            }

            return null;
        }

        public Task<ImmutableList<Passenger>> GetAllPassengers()
        {
            return Task.FromResult(
                users.Values.Where(u => u is Passenger)
                    .Cast<Passenger>()
                    .ToImmutableList()
            );
        }

        public void EmptyPassengersList()
        {
            users = users.Where(p => p.Value is Driver)
                .ToImmutableDictionary();
        }

        public bool IsDriving(string driverId)
        {
            return false;
        }

        public Task<Driver> GetDriver(string driverId)
        {
            if (users.TryGetValue(driverId, out var user))
            {
                if (user is Driver driver)
                {
                    return Task.FromResult(driver);
                }
            }

            throw new ResourceNotFoundException($"Driver '{driverId}'");
        }

        public ImmutableList<Driver> GetAllDrivers()
        {
            ImmutableList<Driver> result = ImmutableList<Driver>.Empty;
            foreach (var (_, user) in users)
                if (user is Driver p)
                    result = result.Add(p);

            return result;
        }

        public void EmptyDriversList()
        {
            users = users.Where(p => p.Value is Passenger)
                .ToImmutableDictionary();
        }
    }
}