using System.Collections.Immutable;
using Liane.Api.Trip;

namespace Liane.Test;

public sealed class LabeledPositions
{
  public static readonly RallyingPoint Mende = new("Mende", "Mende", Positions.Mende, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Florac = new("Florac", "Florac", Positions.Florac, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LeCrouzet = new("LeCrouzet", "LeCrouzet", Positions.LeCrouzet, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint GorgesDuTarnCausses =
    new("GDTC", "GorgesDuTarnCausses", Positions.GorgesDuTarnCausses, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint Cocures = new("Cocures", "Cocures", Positions.Cocures, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Rampon = new("Rampon", "Rampon", Positions.Rampon, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint MontbrunMairie = new("Montbrun_Mairie", "Montbrun_Mairie", Positions.MontbrunMairie, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint BlajouxPelardon = new("Blajoux_Pelardon", "Blajoux_Pelardon", Positions.BlajouxPelardon, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint BlajouxParking = new("Blajoux_Parking", "Blajoux_Parking", Positions.BlajouxParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint IspagnacParking = new("Ispagnac_Parking", "Ispagnac_Parking", Positions.IspagnacParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint QuezacParking = new("Quezac_Parking", "Quezac_Parking", Positions.QuezacParking, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SaintEnimieParking = new("SaintEnimie_Parking", "SaintEnimie_Parking", Positions.SaintEnimieParking, LocationType.CarpoolArea, "", "48000", "", null,
    true);

  public static readonly RallyingPoint LavalDuTarnEglise = new("LavalDuTarn_Eglise", "LavalDuTarn_Eglise", Positions.LavalDuTarnEglise, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SaintChelyDuTarnEnHaut =
    new("SCDT", "SaintChelyDuTarn_En_Haut", Positions.SaintChelyDuTarnEnHaut, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint MontbrunEnBas = new("Montbrun_En_Bas", "Montbrun_En_Bas", Positions.MontbrunEnBas, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LesBondonsParking = new("LesBondons_Parking", "LesBondons_Parking", Positions.LesBondonsParking, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint MontbrunParkingVillage =
    new("MPV", "Montbrun_Parking_Village", Positions.MontbrunParkingVillage, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SaintEtienneDuValdonnezParking =
    new("SEDV_Parking", "SaintEtienneDuValdonnez_Parking", Positions.SaintEtienneDuValdonnezParking, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint Prades = new("Prades", "Prades", Positions.Prades, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint ChamperbouxEglise = new("Cboux_Eglise", "Champerboux_Eglise", Positions.ChamperbouxEglise, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SaintBauzileEglise = new("B_Eglise", "SaintBauzile_Eglise", Positions.SaintBauzileEglise, LocationType.CarpoolArea, "", "48000", "", null,
    true);

  public static readonly RallyingPoint LaMaleneParking = new("La_Malene", "La_Malene_Parking", Positions.LaMaleneParking, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint RouffiacBoulangerie =
    new("Rouffiac", "Rouffiac_Boulangerie", Positions.RouffiacBoulangerie, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint BalsiegeParkingEglise =
    new("Balsiege", "Balsiege_Parking_Eglise", Positions.BalsiegeParkingEglise, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SeveracDAveyronRondPoint =
    new("Severac_dAveyron_Rond_Point", "Severac_dAveyron_Rond_Point", Positions.SeveracDAveyronRondPoint, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint LanuejolsParkingEglise =
    new("LanuejolsfakeId", "Lanuejols_Parking_Eglise", Positions.LanuejolsParkingEglise, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint RodezMacDrive = new("Rodez_Mac_Drive", "Rodez_Mac_Drive", Positions.RodezMacDrive, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint VillefortParkingGare =
    new("Villefort", "Villefort_Parking_Gare", Positions.VillefortParkingGare, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint Alan = new("Alan", "Alan", Positions.Alan, LocationType.CarpoolArea, "", "31420", "", null, true);
  public static readonly RallyingPoint Toulouse = new("Toulouse", "Toulouse", Positions.Toulouse, LocationType.CarpoolArea, "", "31000", "", null, true);

  public static readonly RallyingPoint PointisInard = new("mairie:31427", "Mairie de Pointis-Inard", Positions.PointisInard, LocationType.TownHall, "2 rue Saint-Jean-de-Pointis", "31800",
    "Pointis-Inard", null, true);

  public static readonly RallyingPoint Tournefeuille = new("mairie:31557", "Mairie de Tournefeuille", Positions.Tournefeuille, LocationType.TownHall, "Place de la Mairie", "31170", "Tournefeuille",
    null, true);

  public static readonly RallyingPoint AireDesPyrénées = new("bnlc:31324-C-001", "Aire des Pyrénées", Positions.AireDesPyrénées, LocationType.CarpoolArea, "Avenue des Pyrénées", "31324",
    "Martres-Tolosane", null, true);

  public static readonly RallyingPoint MartresTolosane = new("mairie:31324", "Mairie de Martres-Tolosane", Positions.MartresTolosane, LocationType.TownHall, "12 boulevard de la Magdeleine", "31220",
    "Martres-Tolosane", null, true);

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
    VillefortParkingGare,
    Alan,
    Toulouse,
    PointisInard,
    Tournefeuille,
    AireDesPyrénées,
    MartresTolosane
  );
}