using Liane.Api.Routing;
using Liane.Api.Util;

namespace Liane.Service.Internal.Osrm
{
    // TODO: comment explaining Maneuver object
    public sealed class Maneuver
    {
        public Maneuver(LatLng location, string type, int bearingBefore, int bearingAfter, string? modifier, int? exit)
        {
            Location = location;
            Type = type;
            BearingBefore = bearingBefore;
            BearingAfter = bearingAfter;
            Modifier = modifier;
            Exit = exit;
        }

        // A [longitude, latitude] pair describing the location of the turn.
        public LatLng Location { get; }

        // A string indicating the type of maneuver. new identifiers might be introduced without API change Types unknown to the client should be handled like the turn type,
        // the existence of correct modifier values is guaranteed.
        public string Type { get; }


        // The clockwise angle from true north to the direction of travel immediately before the maneuver. Range 0-359.
        public int BearingBefore { get; }

        // The clockwise angle from true north to the direction of travel immediately after the maneuver. Range 0-359.
        public int BearingAfter { get; }

        // An optional string indicating the direction change of the maneuver.
        public string? Modifier { get; }

        // An optional integer indicating number of the exit to take.
        // The property exists for the roundabout / rotary property: Number of the roundabout exit to take. If exit is undefined the destination is on the roundabout.
        public int? Exit { get; }

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }
    }
}