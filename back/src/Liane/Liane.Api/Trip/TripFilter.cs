namespace Liane.Api.Trip
{
    public enum Days
    {
        Monday,
        Tuesday,
        Wednesday,
        Thursday,
        Friday,
        Saturday,
        Sunday
    }

    public sealed record TripFilter(
        RallyingPoint? From,
        RallyingPoint? To,
        Days? DayFrom,
        Days? DayTo,
        int? HourFrom,
        int? HourTo
    );
}