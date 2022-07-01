using System;
using Liane.Api.Matching;

namespace Liane.Test;

public static class Time {
    public static readonly DateTime SeptAoutMatin = new DateTime(year: 2020, month: 8, day: 7, hour: 11, minute: 30, second:0);
    public static readonly DateTime SeptAoutSoir = new DateTime(year: 2020, month: 8, day: 7, hour: 20, minute: 30, second:0);
}
public static class Users
{
    public static readonly Driver Driver = new Driver(Positions.Mende, Positions.Florac, 1200, Time.SeptAoutMatin);
}

public static class UsersAnotherEnd
{
    public static readonly Passenger TooFarAwayStart = new Passenger(Positions.GorgesDuTarnCausses, Positions.Prades, Time.SeptAoutSoir);
    public static readonly Passenger Matching = new Passenger(Positions.LeCrouzet, Positions.Cocures, Time.SeptAoutSoir);
    public static readonly Passenger TooLateArrival = new Passenger(Positions.LeCrouzet, Positions.Cocures, Time.SeptAoutMatin.AddMinutes(15));
    public static readonly Passenger TooLongDetour = new Passenger(Positions.LeCrouzet, Positions.Rampon, Time.SeptAoutSoir);
}

public static class UsersSameEnd
{
    public static readonly Passenger TooFarAwayStart = new Passenger(Positions.GorgesDuTarnCausses, Positions.Florac, Time.SeptAoutSoir);
    public static readonly Passenger Matching = new Passenger(Positions.LeCrouzet, Positions.Florac, Time.SeptAoutSoir);
    public static readonly Passenger TooLateArrival = new Passenger(Positions.LeCrouzet, Positions.Florac, Time.SeptAoutMatin.AddMinutes(15));
    public static readonly Passenger TooLongDetour = new Passenger(Positions.LeCrouzet, Positions.Rampon, Time.SeptAoutSoir);
}