using System.Collections.Immutable;

namespace Liane.Api.Object
{
    // A Lane represents a turn lane at the corresponding turn location.
    public sealed class Lane
    {
        // a indication (e.g. marking on the road) specifying the turn lane.
        // A road can have multiple indications (e.g. an arrow pointing straight and left).
        // The indications are given in an array, each containing one of the following types.
        // Further indications might be added on without an API version change.
        public Lane(ImmutableList<string> indications, string valid)
        {
            Indications = indications;
            Valid = valid;
        }

        public ImmutableList<string> Indications { get; }
        public string Valid { get; }
        
    }
}