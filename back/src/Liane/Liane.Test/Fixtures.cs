using System;
using Liane.Api.Routing;

namespace Liane.Test
{
    public sealed class Fixtures
    {
        public static readonly DateTime SeptAoutMatin = new DateTime(year: 2020, month: 8, day: 7, hour: 11, minute: 30, second:0);
        public static readonly DateTime SeptAoutSoir = new DateTime(year: 2020, month: 8, day: 7, hour: 20, minute: 30, second:0);
        public static readonly LatLng Mende = new LatLng(44.5180226, 3.4991057);
        public static readonly LatLng Florac = new LatLng(44.31901305, 3.57802065202088);
        public static readonly LatLng LeCrouzet = new LatLng(44.37781287399747, 3.6232057825605857);
        public static readonly LatLng GorgesDuTarnCausses = new LatLng(44.36512697506314, 3.4148390582184485);
        public static readonly LatLng Prades = new LatLng(44.35107686706473,3.459664135275373);
        public static readonly LatLng Cocures = new LatLng(44.34718334543894,3.618854797141151);
        public static readonly LatLng Rampon = new LatLng(44.355594731781366,3.656352079169509);
        public static readonly LatLng Montbrun_Mairie = new LatLng(44.337007, 3.503399);
        public static readonly LatLng Blajoux_Pelardon = new LatLng(44.3388629, 3.4831178);
        public static readonly LatLng Blajoux_Parking = new LatLng(44.33718916852679, 3.4833821654319763);
        
    }
}