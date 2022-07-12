using System.Collections.Immutable;
using Liane.Api.RallyingPoints;

namespace Liane.Test;

public sealed class LabeledPositions
{
    public static readonly RallyingPoint Mende = new("fakeid", "Mende", Positions.Mende, true);
    public static readonly RallyingPoint Florac = new("fakeid", "Florac", Positions.Florac, true);
    public static readonly RallyingPoint LeCrouzet = new("fakeid", "LeCrouzet", Positions.LeCrouzet, true);
    public static readonly RallyingPoint GorgesDuTarnCausses = new("fakeid", "GorgesDuTarnCausses", Positions.GorgesDuTarnCausses, true);
    public static readonly RallyingPoint Cocures = new("fakeid", "Cocures", Positions.Cocures, true);
    public static readonly RallyingPoint Rampon = new("fakeid", "Rampon", Positions.Rampon, true);
    public static readonly RallyingPoint Montbrun_Mairie = new("fakeid", "Montbrun_Mairie", Positions.Montbrun_Mairie, true);
    public static readonly RallyingPoint Blajoux_Pelardon = new("fakeid", "Blajoux_Pelardon", Positions.Blajoux_Pelardon, true);
    public static readonly RallyingPoint Blajoux_Parking = new("fakeid", "Blajoux_Parking", Positions.Blajoux_Parking, true);
    public static readonly RallyingPoint Ispagnac_Parking = new("fakeid", "Ispagnac_Parking", Positions.Ispagnac_Parking, true);
    public static readonly RallyingPoint Quezac_Parking = new("fakeid", "Quezac_Parking", Positions.Quezac_Parking, true);
    public static readonly RallyingPoint SaintEnimie_Parking = new("fakeid", "SaintEnimie_Parking", Positions.SaintEnimie_Parking, true);
    public static readonly RallyingPoint LavalDuTarn_Eglise = new("fakeid", "LavalDuTarn_Eglise", Positions.LavalDuTarn_Eglise, true);
    public static readonly RallyingPoint SaintChelyDuTarn_En_Haut = new("fakeid", "SaintChelyDuTarn_En_Haut", Positions.SaintChelyDuTarn_En_Haut, true);
    public static readonly RallyingPoint Montbrun_En_Bas = new("fakeid", "Montbrun_En_Bas", Positions.Montbrun_En_Bas, true);
    public static readonly RallyingPoint LesBondons_Parking = new("fakeid", "LesBondons_Parking", Positions.LesBondons_Parking, true);
    public static readonly RallyingPoint Montbrun_Parking_Village = new("fakeid", "Montbrun_Parking_Village", Positions.Montbrun_Parking_Village, true);

    public static readonly RallyingPoint SaintEtienneDuValdonnez_Parking =
        new("fakeid", "SaintEtienneDuValdonnez_Parking", Positions.SaintEtienneDuValdonnez_Parking, true);

    public static readonly RallyingPoint Prades = new("fakeid", "Prades", Positions.Prades, true);
    public static readonly RallyingPoint Champerboux_Eglise = new("fakeid", "Champerboux_Eglise", Positions.Champerboux_Eglise, true);
    public static readonly RallyingPoint SaintBauzile_Eglise = new("fakeid", "SaintBauzile_Eglise", Positions.SaintBauzile_Eglise, true);
    public static readonly RallyingPoint La_Malene_Parking = new("fakeid", "La_Malene_Parking", Positions.La_Malene_Parking, true);
    public static readonly RallyingPoint Rouffiac_Boulangerie = new("fakeid", "Rouffiac_Boulangerie", Positions.Rouffiac_Boulangerie, true);
    public static readonly RallyingPoint Balsiege_Parking_Eglise = new("fakeid", "Balsiege_Parking_Eglise", Positions.Balsiege_Parking_Eglise, true);
    public static readonly RallyingPoint Severac_dAveyron_Rond_Point = new("fakeid", "Severac_dAveyron_Rond_Point", Positions.Severac_dAveyron_Rond_Point, true);
    public static readonly RallyingPoint Lanuejols_Parking_Eglise = new("fakeid", "Lanuejols_Parking_Eglise", Positions.Lanuejols_Parking_Eglise, true);
    public static readonly RallyingPoint Rodez_Mac_Drive = new("fakeid", "Rodez_Mac_Drive", Positions.Rodez_Mac_Drive, true);
    public static readonly RallyingPoint Villefort_Parking_Gare = new("fakeid", "Villefort_Parking_Gare", Positions.Villefort_Parking_Gare, true);

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