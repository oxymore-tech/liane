namespace Liane.Api.Location
{
    public sealed record Coords(double Latitude, double Longitude, int? Accuracy, float? Speed);
}