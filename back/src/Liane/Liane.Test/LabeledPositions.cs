using System.Collections.Immutable;
using Liane.Api.Trip;

namespace Liane.Test;

public sealed class LabeledPositions
{
  public static readonly RallyingPoint Mende = new("fakeid", "Mende", Positions.Mende, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Florac = new("fakeid", "Florac", Positions.Florac, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LeCrouzet = new("fakeid", "LeCrouzet", Positions.LeCrouzet, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint GorgesDuTarnCausses = new("fakeid", "GorgesDuTarnCausses", Positions.GorgesDuTarnCausses, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Cocures = new("fakeid", "Cocures", Positions.Cocures, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Rampon = new("fakeid", "Rampon", Positions.Rampon, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint MontbrunMairie = new("fakeid", "Montbrun_Mairie", Positions.MontbrunMairie, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint BlajouxPelardon = new("fakeid", "Blajoux_Pelardon", Positions.BlajouxPelardon, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint BlajouxParking = new("fakeid", "Blajoux_Parking", Positions.BlajouxParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint IspagnacParking = new("fakeid", "Ispagnac_Parking", Positions.IspagnacParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint QuezacParking = new("fakeid", "Quezac_Parking", Positions.QuezacParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint SaintEnimieParking = new("fakeid", "SaintEnimie_Parking", Positions.SaintEnimieParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LavalDuTarnEglise = new("fakeid", "LavalDuTarn_Eglise", Positions.LavalDuTarnEglise, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint SaintChelyDuTarnEnHaut = new("fakeid", "SaintChelyDuTarn_En_Haut", Positions.SaintChelyDuTarnEnHaut, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint MontbrunEnBas = new("fakeid", "Montbrun_En_Bas", Positions.MontbrunEnBas, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LesBondonsParking = new("fakeid", "LesBondons_Parking", Positions.LesBondonsParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint MontbrunParkingVillage = new("fakeid", "Montbrun_Parking_Village", Positions.MontbrunParkingVillage, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SaintEtienneDuValdonnezParking =
    new("fakeid", "SaintEtienneDuValdonnez_Parking", Positions.SaintEtienneDuValdonnezParking, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint Prades = new("fakeid", "Prades", Positions.Prades, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint ChamperbouxEglise = new("fakeid", "Champerboux_Eglise", Positions.ChamperbouxEglise, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint SaintBauzileEglise = new("fakeid", "SaintBauzile_Eglise", Positions.SaintBauzileEglise, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LaMaleneParking = new("fakeid", "La_Malene_Parking", Positions.LaMaleneParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint RouffiacBoulangerie = new("fakeid", "Rouffiac_Boulangerie", Positions.RouffiacBoulangerie, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint BalsiegeParkingEglise = new("fakeid", "Balsiege_Parking_Eglise", Positions.BalsiegeParkingEglise, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SeveracDAveyronRondPoint =
    new("fakeid", "Severac_dAveyron_Rond_Point", Positions.SeveracDAveyronRondPoint, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint LanuejolsParkingEglise = new("fakeid", "Lanuejols_Parking_Eglise", Positions.LanuejolsParkingEglise, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint RodezMacDrive = new("fakeid", "Rodez_Mac_Drive", Positions.RodezMacDrive, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint VillefortParkingGare = new("fakeid", "Villefort_Parking_Gare", Positions.VillefortParkingGare, LocationType.CarpoolArea, "", "48000", "", null, true);

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