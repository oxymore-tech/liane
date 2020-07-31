using Liane.Api.Matching;

namespace Liane.Test
{
    public static class Users
    {
        public static readonly Driver Driver = new Driver(Fixtures.Mende, Fixtures.Florac, 1200, Fixtures.SeptAoutMatin);
    }

    public static class UsersAnotherEnd
    {
        public static readonly Passenger TooFarAwayStart = new Passenger(Fixtures.GorgesDuTarnCausses, Fixtures.Prades, Fixtures.SeptAoutSoir);
        public static readonly Passenger Matching = new Passenger(Fixtures.LeCrouzet, Fixtures.Cocures, Fixtures.SeptAoutSoir);
        public static readonly Passenger TooLateArrival = new Passenger(Fixtures.LeCrouzet, Fixtures.Cocures, Fixtures.SeptAoutMatin.AddMinutes(15));
        public static readonly Passenger TooLongDetour = new Passenger(Fixtures.LeCrouzet, Fixtures.Rampon, Fixtures.SeptAoutSoir);
    }

    public static class UsersSameEnd
    {
        public static readonly Passenger TooFarAwayStart = new Passenger(Fixtures.GorgesDuTarnCausses, Fixtures.Florac, Fixtures.SeptAoutSoir);
        public static readonly Passenger Matching = new Passenger(Fixtures.LeCrouzet, Fixtures.Florac, Fixtures.SeptAoutSoir);
        public static readonly Passenger TooLateArrival = new Passenger(Fixtures.LeCrouzet, Fixtures.Florac, Fixtures.SeptAoutMatin.AddMinutes(15));
        public static readonly Passenger TooLongDetour = new Passenger(Fixtures.LeCrouzet, Fixtures.Rampon, Fixtures.SeptAoutSoir);
    }
}