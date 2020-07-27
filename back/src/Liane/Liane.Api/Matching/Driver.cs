namespace Liane.Api.Matching
{
    public sealed class Driver
    {
        public Driver(Travel travel)
        {
            Travel = travel;
        }

        public Travel Travel { get; }
        
    }
}