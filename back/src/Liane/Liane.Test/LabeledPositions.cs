using System.Collections.Immutable;
using Liane.Api.Trip;

namespace Liane.Test;

public sealed class LabeledPositions
{
  
  public static readonly RallyingPoint Mende = new("Mende_fakeId", "Mende", Positions.Mende, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Florac = new("Florac_fakeId", "Florac", Positions.Florac, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LeCrouzet = new("LeCrouzet_fakeId", "LeCrouzet", Positions.LeCrouzet, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint GorgesDuTarnCausses = new("GorgesDuTarnCausses_fakeId", "GorgesDuTarnCausses", Positions.GorgesDuTarnCausses, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Cocures = new("Cocures_fakeId", "Cocures", Positions.Cocures, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Rampon = new("Rampon_fakeId", "Rampon", Positions.Rampon, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint MontbrunMairie = new("Montbrun_Mairie_fakeId", "Montbrun_Mairie", Positions.MontbrunMairie, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint BlajouxPelardon = new("Blajoux_Pelardon_fakeId", "Blajoux_Pelardon", Positions.BlajouxPelardon, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint BlajouxParking = new("Blajoux_Parking_fakeId", "Blajoux_Parking", Positions.BlajouxParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint IspagnacParking = new("Ispagnac_Parking_fakeId", "Ispagnac_Parking", Positions.IspagnacParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint QuezacParking = new("Quezac_Parking_fakeId", "Quezac_Parking", Positions.QuezacParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint SaintEnimieParking = new("SaintEnimie_Parking_fakeId", "SaintEnimie_Parking", Positions.SaintEnimieParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LavalDuTarnEglise = new("LavalDuTarn_Eglise_fakeId", "LavalDuTarn_Eglise", Positions.LavalDuTarnEglise, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint SaintChelyDuTarnEnHaut = new("SaintChelyDuTarn_En_Haut_fakeId", "SaintChelyDuTarn_En_Haut", Positions.SaintChelyDuTarnEnHaut, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint MontbrunEnBas = new("Montbrun_En_Bas_fakeId", "Montbrun_En_Bas", Positions.MontbrunEnBas, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LesBondonsParking = new("LesBondons_Parking_fakeId", "LesBondons_Parking", Positions.LesBondonsParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint MontbrunParkingVillage = new("Montbrun_Parking_Village_fakeId", "Montbrun_Parking_Village", Positions.MontbrunParkingVillage, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SaintEtienneDuValdonnezParking =
    new("SaintEtienneDuValdonnez_Parking_fakeId", "SaintEtienneDuValdonnez_Parking", Positions.SaintEtienneDuValdonnezParking, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint Prades = new("Prades_fakeId", "Prades", Positions.Prades, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint ChamperbouxEglise = new("Champerboux_Eglise_fakeId", "Champerboux_Eglise", Positions.ChamperbouxEglise, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint SaintBauzileEglise = new("SaintBauzile_Eglise_fakeId", "SaintBauzile_Eglise", Positions.SaintBauzileEglise, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint LaMaleneParking = new("La_Malene_Parking_fakeId", "La_Malene_Parking", Positions.LaMaleneParking, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint RouffiacBoulangerie = new("Rouffiac_Boulangerie_fakeId", "Rouffiac_Boulangerie", Positions.RouffiacBoulangerie, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint BalsiegeParkingEglise = new("Balsiege_Parking_Eglise_fakeId", "Balsiege_Parking_Eglise", Positions.BalsiegeParkingEglise, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint SeveracDAveyronRondPoint =
    new("Severac_dAveyron_Rond_Point_fakeId", "Severac_dAveyron_Rond_Point", Positions.SeveracDAveyronRondPoint, LocationType.CarpoolArea, "", "48000", "", null, true);

  public static readonly RallyingPoint LanuejolsParkingEglise = new("Lanuejols_Parking_Eglise_fakeId", "Lanuejols_Parking_Eglise", Positions.LanuejolsParkingEglise, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint RodezMacDrive = new("Rodez_Mac_Drive_fakeId", "Rodez_Mac_Drive", Positions.RodezMacDrive, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint VillefortParkingGare = new("Villefort_Parking_Gare_fakeId", "Villefort_Parking_Gare", Positions.VillefortParkingGare, LocationType.CarpoolArea, "", "48000", "", null, true);
  public static readonly RallyingPoint Alan = new("Alan", "Alan", Positions.Alan, LocationType.CarpoolArea, "", "31420", "", null, true);
  public static readonly RallyingPoint Toulouse = new("Toulouse", "Toulouse", Positions.Toulouse, LocationType.CarpoolArea, "", "31000", "", null, true);

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
    Toulouse
  );
}