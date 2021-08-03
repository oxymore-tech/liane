using System.Collections.Immutable;
using Liane.Api;
using Liane.Api.Rp;

namespace Liane.Test
{
    public sealed class LabeledPositions
    {
        public static readonly RallyingPoint2 Mende = new ("fakeid", "Mende", Positions.Mende);
        public static readonly RallyingPoint2 Florac = new ("fakeid","Florac", Positions.Florac);
        public static readonly RallyingPoint2 LeCrouzet = new ("fakeid","LeCrouzet", Positions.LeCrouzet);
        public static readonly RallyingPoint2 GorgesDuTarnCausses = new ("fakeid","GorgesDuTarnCausses", Positions.GorgesDuTarnCausses);
        public static readonly RallyingPoint2 Cocures = new ("fakeid","Cocures", Positions.Cocures);
        public static readonly RallyingPoint2 Rampon = new ("fakeid","Rampon", Positions.Rampon);
        public static readonly RallyingPoint2 Montbrun_Mairie = new ("fakeid","Montbrun_Mairie", Positions.Montbrun_Mairie);
        public static readonly RallyingPoint2 Blajoux_Pelardon = new ("fakeid","Blajoux_Pelardon", Positions.Blajoux_Pelardon);
        public static readonly RallyingPoint2 Blajoux_Parking = new ("fakeid","Blajoux_Parking", Positions.Blajoux_Parking);
        public static readonly RallyingPoint2 Ispagnac_Parking = new ("fakeid","Ispagnac_Parking", Positions.Ispagnac_Parking);
        public static readonly RallyingPoint2 Quezac_Parking = new ("fakeid","Quezac_Parking", Positions.Quezac_Parking);
        public static readonly RallyingPoint2 SaintEnimie_Parking = new ("fakeid","SaintEnimie_Parking", Positions.SaintEnimie_Parking);
        public static readonly RallyingPoint2 LavalDuTarn_Eglise = new ("fakeid","LavalDuTarn_Eglise", Positions.LavalDuTarn_Eglise);
        public static readonly RallyingPoint2 SaintChelyDuTarn_En_Haut = new ("fakeid","SaintChelyDuTarn_En_Haut", Positions.SaintChelyDuTarn_En_Haut);
        public static readonly RallyingPoint2 Montbrun_En_Bas = new ("fakeid","Montbrun_En_Bas", Positions.Montbrun_En_Bas);
        public static readonly RallyingPoint2 LesBondons_Parking = new ("fakeid","LesBondons_Parking", Positions.LesBondons_Parking);
        public static readonly RallyingPoint2 Montbrun_Parking_Village = new ("fakeid","Montbrun_Parking_Village", Positions.Montbrun_Parking_Village);

        public static readonly RallyingPoint2 SaintEtienneDuValdonnez_Parking =
            new ("fakeid","SaintEtienneDuValdonnez_Parking", Positions.SaintEtienneDuValdonnez_Parking);

        public static readonly RallyingPoint2 Prades = new ("fakeid","Prades", Positions.Prades);
        public static readonly RallyingPoint2 Champerboux_Eglise = new ("fakeid","Champerboux_Eglise", Positions.Champerboux_Eglise);
        public static readonly RallyingPoint2 SaintBauzile_Eglise = new ("fakeid","SaintBauzile_Eglise", Positions.SaintBauzile_Eglise);
        public static readonly RallyingPoint2 La_Malene_Parking = new ("fakeid","La_Malene_Parking", Positions.La_Malene_Parking);
        public static readonly RallyingPoint2 Rouffiac_Boulangerie = new ("fakeid","Rouffiac_Boulangerie", Positions.Rouffiac_Boulangerie);
        public static readonly RallyingPoint2 Balsiege_Parking_Eglise = new ("fakeid","Balsiege_Parking_Eglise", Positions.Balsiege_Parking_Eglise);
        public static readonly RallyingPoint2 Severac_dAveyron_Rond_Point = new ("fakeid","Severac_dAveyron_Rond_Point", Positions.Severac_dAveyron_Rond_Point);
        public static readonly RallyingPoint2 Lanuejols_Parking_Eglise = new ("fakeid","Lanuejols_Parking_Eglise", Positions.Lanuejols_Parking_Eglise);
        public static readonly RallyingPoint2 Rodez_Mac_Drive = new ("fakeid","Rodez_Mac_Drive", Positions.Rodez_Mac_Drive);
        public static readonly RallyingPoint2 Villefort_Parking_Gare = new ("fakeid","Villefort_Parking_Gare", Positions.Villefort_Parking_Gare);

        public static readonly IImmutableSet<RallyingPoint2> RallyingPoints = ImmutableHashSet.Create(
            Mende,
            Florac,
            LeCrouzet,
            GorgesDuTarnCausses,
            Cocures,
            Rampon,
            Montbrun_Mairie,
            Blajoux_Parking,
            Ispagnac_Parking,
            Quezac_Parking,
            SaintEnimie_Parking,
            LavalDuTarn_Eglise,
            SaintChelyDuTarn_En_Haut,
            Montbrun_En_Bas,
            LesBondons_Parking,
            Montbrun_Parking_Village,
            SaintEtienneDuValdonnez_Parking,
            Prades,
            Champerboux_Eglise,
            SaintBauzile_Eglise,
            La_Malene_Parking,
            Rouffiac_Boulangerie,
            Balsiege_Parking_Eglise,
            Severac_dAveyron_Rond_Point,
            Lanuejols_Parking_Eglise,
            Rodez_Mac_Drive,
            Villefort_Parking_Gare
        );
    }
}