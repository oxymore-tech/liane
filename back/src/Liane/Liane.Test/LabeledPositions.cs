using Liane.Api.Display;
using System.Collections.Immutable;

namespace Liane.Test
{
    public sealed class LabeledPositions
    {
        public static readonly LabeledPosition Mende = new LabeledPosition("Mende", Positions.Mende);
        public static readonly LabeledPosition Florac = new LabeledPosition("Florac", Positions.Florac);
        public static readonly LabeledPosition LeCrouzet = new LabeledPosition("LeCrouzet", Positions.LeCrouzet);
        public static readonly LabeledPosition GorgesDuTarnCausses = new LabeledPosition("GorgesDuTarnCausses", Positions.GorgesDuTarnCausses);
        public static readonly LabeledPosition Cocures = new LabeledPosition("Cocures", Positions.Cocures);
        public static readonly LabeledPosition Rampon = new LabeledPosition("Rampon", Positions.Rampon);
        public static readonly LabeledPosition Montbrun_Mairie = new LabeledPosition("Montbrun_Mairie", Positions.Montbrun_Mairie);
        public static readonly LabeledPosition Blajoux_Pelardon = new LabeledPosition("Blajoux_Pelardon", Positions.Blajoux_Pelardon);
        public static readonly LabeledPosition Blajoux_Parking = new LabeledPosition("Blajoux_Parking", Positions.Blajoux_Parking);
        public static readonly LabeledPosition Ispagnac_Parking = new LabeledPosition("Ispagnac_Parking", Positions.Ispagnac_Parking);
        public static readonly LabeledPosition Quezac_Parking = new LabeledPosition("Quezac_Parking", Positions.Quezac_Parking);
        public static readonly LabeledPosition SaintEnimie_Parking = new LabeledPosition("SaintEnimie_Parking", Positions.SaintEnimie_Parking);
        public static readonly LabeledPosition LavalDuTarn_Eglise = new LabeledPosition("LavalDuTarn_Eglise", Positions.LavalDuTarn_Eglise);
        public static readonly LabeledPosition SaintChelyDuTarn_En_Haut = new LabeledPosition("SaintChelyDuTarn_En_Haut", Positions.SaintChelyDuTarn_En_Haut);
        public static readonly LabeledPosition Montbrun_En_Bas = new LabeledPosition("Montbrun_En_Bas", Positions.Montbrun_En_Bas);
        public static readonly LabeledPosition LesBondons_Parking = new LabeledPosition("LesBondons_Parking", Positions.LesBondons_Parking);
        public static readonly LabeledPosition Montbrun_Parking_Village = new LabeledPosition("Montbrun_Parking_Village", Positions.Montbrun_Parking_Village);
        public static readonly LabeledPosition SaintEtienneDuValdonnez_Parking = new LabeledPosition("SaintEtienneDuValdonnez_Parking", Positions.SaintEtienneDuValdonnez_Parking);
        public static readonly LabeledPosition Prades = new LabeledPosition("Prades", Positions.Prades);
        public static readonly LabeledPosition Champerboux_Eglise = new LabeledPosition("Champerboux_Eglise", Positions.Champerboux_Eglise);
        public static readonly LabeledPosition SaintBauzile_Eglise = new LabeledPosition("SaintBauzile_Eglise", Positions.SaintBauzile_Eglise);
        public static readonly LabeledPosition La_Malene_Parking = new LabeledPosition("La_Malene_Parking", Positions.La_Malene_Parking);
        public static readonly LabeledPosition Rouffiac_Boulangerie = new LabeledPosition("Rouffiac_Boulangerie", Positions.Rouffiac_Boulangerie);
        public static readonly LabeledPosition Balsiege_Parking_Eglise = new LabeledPosition("Balsiege_Parking_Eglise", Positions.Balsiege_Parking_Eglise);
        public static readonly LabeledPosition Severac_dAveyron_Rond_Point = new LabeledPosition("Severac_dAveyron_Rond_Point", Positions.Severac_dAveyron_Rond_Point);
        public static readonly LabeledPosition Lanuejols_Parking_Eglise = new LabeledPosition("Lanuejols_Parking_Eglise", Positions.Lanuejols_Parking_Eglise);
        public static readonly LabeledPosition Rodez_Mac_Drive = new LabeledPosition("Rodez_Mac_Drive", Positions.Rodez_Mac_Drive);
        public static readonly LabeledPosition Villefort_Parking_Gare = new LabeledPosition("Villefort_Parking_Gare", Positions.Villefort_Parking_Gare);

        public static readonly IImmutableSet<LabeledPosition> RallyingPoints = ImmutableHashSet.Create(
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