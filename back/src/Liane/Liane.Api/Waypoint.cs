namespace Liane.Api
{
    public sealed class Waypoint
    {
        public Waypoint(double duration)
        {
            Duration = duration;
        }
        
        public double Duration { get; }
    }
}