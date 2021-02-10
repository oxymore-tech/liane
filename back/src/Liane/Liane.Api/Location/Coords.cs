namespace Liane.Api.Location
{
    public sealed record Coords(double latitude, double longitude, int? accuracy, float? speed);
}