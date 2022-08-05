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
    public static readonly RallyingPoint MontbrunMairie = new("fakeid", "Montbrun_Mairie", Positions.MontbrunMairie, true);
    public static readonly RallyingPoint BlajouxPelardon = new("fakeid", "Blajoux_Pelardon", Positions.BlajouxPelardon, true);
    public static readonly RallyingPoint BlajouxParking = new("fakeid", "Blajoux_Parking", Positions.BlajouxParking, true);
    public static readonly RallyingPoint IspagnacParking = new("fakeid", "Ispagnac_Parking", Positions.IspagnacParking, true);
    public static readonly RallyingPoint QuezacParking = new("fakeid", "Quezac_Parking", Positions.QuezacParking, true);
    public static readonly RallyingPoint SaintEnimieParking = new("fakeid", "SaintEnimie_Parking", Positions.SaintEnimieParking, true);
    public static readonly RallyingPoint LavalDuTarnEglise = new("fakeid", "LavalDuTarn_Eglise", Positions.LavalDuTarnEglise, true);
    public static readonly RallyingPoint SaintChelyDuTarnEnHaut = new("fakeid", "SaintChelyDuTarn_En_Haut", Positions.SaintChelyDuTarnEnHaut, true);
    public static readonly RallyingPoint MontbrunEnBas = new("fakeid", "Montbrun_En_Bas", Positions.MontbrunEnBas, true);
    public static readonly RallyingPoint LesBondonsParking = new("fakeid", "LesBondons_Parking", Positions.LesBondonsParking, true);
    public static readonly RallyingPoint MontbrunParkingVillage = new("fakeid", "Montbrun_Parking_Village", Positions.MontbrunParkingVillage, true);

    public static readonly RallyingPoint SaintEtienneDuValdonnezParking =
        new("fakeid", "SaintEtienneDuValdonnez_Parking", Positions.SaintEtienneDuValdonnezParking, true);

    public static readonly RallyingPoint Prades = new("fakeid", "Prades", Positions.Prades, true);
    public static readonly RallyingPoint ChamperbouxEglise = new("fakeid", "Champerboux_Eglise", Positions.ChamperbouxEglise, true);
    public static readonly RallyingPoint SaintBauzileEglise = new("fakeid", "SaintBauzile_Eglise", Positions.SaintBauzileEglise, true);
    public static readonly RallyingPoint LaMaleneParking = new("fakeid", "La_Malene_Parking", Positions.LaMaleneParking, true);
    public static readonly RallyingPoint RouffiacBoulangerie = new("fakeid", "Rouffiac_Boulangerie", Positions.RouffiacBoulangerie, true);
    public static readonly RallyingPoint BalsiegeParkingEglise = new("fakeid", "Balsiege_Parking_Eglise", Positions.BalsiegeParkingEglise, true);
    public static readonly RallyingPoint SeveracDAveyronRondPoint = new("fakeid", "Severac_dAveyron_Rond_Point", Positions.SeveracDAveyronRondPoint, true);
    public static readonly RallyingPoint LanuejolsParkingEglise = new("fakeid", "Lanuejols_Parking_Eglise", Positions.LanuejolsParkingEglise, true);
    public static readonly RallyingPoint RodezMacDrive = new("fakeid", "Rodez_Mac_Drive", Positions.RodezMacDrive, true);
    public static readonly RallyingPoint VillefortParkingGare = new("fakeid", "Villefort_Parking_Gare", Positions.VillefortParkingGare, true);

    public static readonly IImmutableSet<RallyingPoint> RallyingPoints = ImmutableHashSet.Create(
        Mende,
        Florac,
        LeCrouzet,
        GorgesDuTarnCausses,
        Cocures,
        Rampon,
        MontbrunMairie,
        BlajouxParking,
        IspagnacParking,
        QuezacParking,
        SaintEnimieParking,
        LavalDuTarnEglise,
        SaintChelyDuTarnEnHaut,
        MontbrunEnBas,
        LesBondonsParking,
        MontbrunParkingVillage,
        SaintEtienneDuValdonnezParking,
        Prades,
        ChamperbouxEglise,
        SaintBauzileEglise,
        LaMaleneParking,
        RouffiacBoulangerie,
        BalsiegeParkingEglise,
        SeveracDAveyronRondPoint,
        LanuejolsParkingEglise,
        RodezMacDrive,
        VillefortParkingGare
    );
}