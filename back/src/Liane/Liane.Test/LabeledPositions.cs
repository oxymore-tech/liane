using Liane.Api.Display;
using System.Collections.Immutable;

namespace Liane.Test
{
    public sealed class LabeledPositions
    {
        public static readonly RallyingPoint Mende = new RallyingPoint("Mende", Positions.Mende);
        public static readonly RallyingPoint Florac = new RallyingPoint("Florac", Positions.Florac);
        public static readonly RallyingPoint LeCrouzet = new RallyingPoint("LeCrouzet", Positions.LeCrouzet);
        public static readonly RallyingPoint GorgesDuTarnCausses = new RallyingPoint("GorgesDuTarnCausses", Positions.GorgesDuTarnCausses);
        public static readonly RallyingPoint Cocures = new RallyingPoint("Cocures", Positions.Cocures);
        public static readonly RallyingPoint Rampon = new RallyingPoint("Rampon", Positions.Rampon);
        public static readonly RallyingPoint Montbrun_Mairie = new RallyingPoint("Montbrun_Mairie", Positions.Montbrun_Mairie);
        public static readonly RallyingPoint Blajoux_Pelardon = new RallyingPoint("Blajoux_Pelardon", Positions.Blajoux_Pelardon);
        public static readonly RallyingPoint Blajoux_Parking = new RallyingPoint("Blajoux_Parking", Positions.Blajoux_Parking);
        public static readonly RallyingPoint Ispagnac_Parking = new RallyingPoint("Ispagnac_Parking", Positions.Ispagnac_Parking);
        public static readonly RallyingPoint Quezac_Parking = new RallyingPoint("Quezac_Parking", Positions.Quezac_Parking);
        public static readonly RallyingPoint SaintEnimie_Parking = new RallyingPoint("SaintEnimie_Parking", Positions.SaintEnimie_Parking);
        public static readonly RallyingPoint LavalDuTarn_Eglise = new RallyingPoint("LavalDuTarn_Eglise", Positions.LavalDuTarn_Eglise);
        public static readonly RallyingPoint SaintChelyDuTarn_En_Haut = new RallyingPoint("SaintChelyDuTarn_En_Haut", Positions.SaintChelyDuTarn_En_Haut);
        public static readonly RallyingPoint Montbrun_En_Bas = new RallyingPoint("Montbrun_En_Bas", Positions.Montbrun_En_Bas);
        public static readonly RallyingPoint LesBondons_Parking = new RallyingPoint("LesBondons_Parking", Positions.LesBondons_Parking);
        public static readonly RallyingPoint Montbrun_Parking_Village = new RallyingPoint("Montbrun_Parking_Village", Positions.Montbrun_Parking_Village);
        public static readonly RallyingPoint SaintEtienneDuValdonnez_Parking = new RallyingPoint("SaintEtienneDuValdonnez_Parking", Positions.SaintEtienneDuValdonnez_Parking);
        public static readonly RallyingPoint Prades = new RallyingPoint("Prades", Positions.Prades);
        public static readonly RallyingPoint Champerboux_Eglise = new RallyingPoint("Champerboux_Eglise", Positions.Champerboux_Eglise);
        public static readonly RallyingPoint SaintBauzile_Eglise = new RallyingPoint("SaintBauzile_Eglise", Positions.SaintBauzile_Eglise);
        public static readonly RallyingPoint La_Malene_Parking = new RallyingPoint("La_Malene_Parking", Positions.La_Malene_Parking);
        public static readonly RallyingPoint Rouffiac_Boulangerie = new RallyingPoint("Rouffiac_Boulangerie", Positions.Rouffiac_Boulangerie);
        public static readonly RallyingPoint Balsiege_Parking_Eglise = new RallyingPoint("Balsiege_Parking_Eglise", Positions.Balsiege_Parking_Eglise);
        public static readonly RallyingPoint Severac_dAveyron_Rond_Point = new RallyingPoint("Severac_dAveyron_Rond_Point", Positions.Severac_dAveyron_Rond_Point);
        public static readonly RallyingPoint Lanuejols_Parking_Eglise = new RallyingPoint("Lanuejols_Parking_Eglise", Positions.Lanuejols_Parking_Eglise);
        public static readonly RallyingPoint Rodez_Mac_Drive = new RallyingPoint("Rodez_Mac_Drive", Positions.Rodez_Mac_Drive);
        public static readonly RallyingPoint Villefort_Parking_Gare = new RallyingPoint("Villefort_Parking_Gare", Positions.Villefort_Parking_Gare);

        public static readonly IImmutableSet<RallyingPoint> RallyingPoints = ImmutableHashSet.Create(
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