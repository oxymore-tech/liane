using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util;

namespace Liane.Service.Internal.Osrm;

// An intersection gives a full representation of any cross-way the path passes bay.
// For every step, the very first intersection (intersections[0]) corresponds to
// the location of the StepManeuver. Further intersections are listed
// for every cross-way until the next turn instruction.
public class Intersection
{
    public Intersection(LngLatTuple location, ImmutableList<int> bearings, ImmutableList<string> classes, ImmutableList<bool> entry, int @in, int @out, ImmutableList<Lane> lanes)
    {
        Location = location;
        Bearings = bearings;
        Classes = classes;
        Entry = entry;
        In = @in;
        Out = @out;
        Lanes = lanes;
    }

    // A [longitude, latitude] pair describing the location of the turn.
    public LngLatTuple Location { get; }

    // A list of bearing values (e.g. [0,90,180,270]) that are available at the intersection. The bearings describe all available roads at the intersection.
    // Values are between 0-359 (0=true north)
    public ImmutableList<int> Bearings { get; }

    // An array of strings signifying the classes (as specified in the profile)
    // of the road exiting the intersection.
    public ImmutableList<string> Classes { get; }

    // A list of entry flags, corresponding in a 1:1 relationship to the bearings. A value of true indicates that the respective road could be entered on a valid route. false indicates that the turn
    // onto the respective road would violate a restriction.
    public ImmutableList<bool> Entry { get; }

    // index into bearings/entry array. Used to calculate the bearing just before the turn. Namely, the clockwise angle from true north to the direction of travel immediately before the maneuver/passing the intersection.
    // Bearings are given relative to the intersection. To get the bearing in the direction of driving, the bearing has to be rotated by a value of 180.
    // The value is not supplied for depart maneuvers.
    public int In { get; }

    // index into the bearings/entry array.
    // Used to extract the bearing just after the turn.
    // Namely, The clockwise angle from true north to the direction of travel immediately after the maneuver/passing the intersection. The value is not supplied for arrive maneuvers.
    public int Out { get; }

    // Array of Lane objects that denote the available turn lanes at the intersection. If no lane information is available for an intersection,
    // the lanes property will not be present.
    public ImmutableList<Lane> Lanes { get; }

    public override string ToString()
    {
        return StringUtils.ToString(this);
    }
}