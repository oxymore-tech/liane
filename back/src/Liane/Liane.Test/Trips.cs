using System.Collections.Immutable;
using Liane.Api.Trip;

namespace Liane.Test;

public sealed class Trips
{
    public static readonly Trip MendeFlorac = new Trip(ImmutableList.Create(LabeledPositions.Mende, LabeledPositions.LesBondonsParking, LabeledPositions.Florac));
    public static readonly Trip BlajouxFlorac = new Trip(ImmutableList.Create(LabeledPositions.BlajouxParking, LabeledPositions.MontbrunEnBas, LabeledPositions.Florac));
    public static readonly Trip BlajouxMende = new Trip(ImmutableList.Create(LabeledPositions.BlajouxParking, LabeledPositions.MontbrunEnBas, LabeledPositions.Mende));
    public static readonly Trip FloracLesBondons = new Trip(ImmutableList.Create(LabeledPositions.Florac, LabeledPositions.Cocures, LabeledPositions.LeCrouzet, LabeledPositions.LesBondonsParking), "CONDUCTEUR_5", 8);
    public static readonly Trip BlajouxMontbrunEnBas3 = new Trip(ImmutableList.Create(LabeledPositions.BlajouxParking, LabeledPositions.MontbrunEnBas), "CONDUCTEUR_1", 8);
    public static readonly Trip BlajouxMontbrunEnBas = new Trip(ImmutableList.Create(LabeledPositions.BlajouxParking, LabeledPositions.MontbrunEnBas), "CONDUCTEUR_1", 10);
    public static readonly Trip BlajouxMontbrunEnBas2 = new Trip(ImmutableList.Create(LabeledPositions.BlajouxParking, LabeledPositions.MontbrunEnBas), "CONDUCTEUR_1", 15);
    public static readonly Trip MontbrunEnBasLaMalene = new Trip(ImmutableList.Create(LabeledPositions.MontbrunEnBas, LabeledPositions.LaMaleneParking), "CONDUCTEUR_1", 9);
    public static readonly Trip LaMaleneSeverac = new Trip(ImmutableList.Create(LabeledPositions.LaMaleneParking, LabeledPositions.SeveracDAveyronRondPoint), "CONDUCTEUR_1", 10);
    public static readonly Trip FloracCocures = new Trip(ImmutableList.Create(LabeledPositions.Florac, LabeledPositions.Cocures), "CONDUCTEUR_5", 8);
    public static readonly Trip FloracLeCrouzet = new Trip(ImmutableList.Create(LabeledPositions.Florac, LabeledPositions.Cocures, LabeledPositions.LeCrouzet), "CONDUCTEUR_5", 8);
    public static readonly Trip CocuresLeCrouzet = new Trip(ImmutableList.Create(LabeledPositions.Cocures, LabeledPositions.LeCrouzet), "CONDUCTEUR_5", 8);
    public static readonly Trip PradesLaMalene = new Trip(ImmutableList.Create(LabeledPositions.Prades, LabeledPositions.LaMaleneParking), "CONDUCTEUR_2", 9);
    public static readonly Trip LaMaleneSeverac2 = new Trip(ImmutableList.Create(LabeledPositions.LaMaleneParking, LabeledPositions.SeveracDAveyronRondPoint), "CONDUCTEUR_2", 10);

    public static readonly Trip MendeFlorac1 = new Trip(ImmutableList.Create(
        LabeledPositions.Mende, 
        LabeledPositions.BalsiegeParkingEglise,
        LabeledPositions.QuezacParking,
        LabeledPositions.IspagnacParking,
        LabeledPositions.Florac
    ));
    public static readonly Trip MendeFlorac2 = new Trip(ImmutableList.Create(
        LabeledPositions.Mende, 
        LabeledPositions.SaintEtienneDuValdonnezParking,
        LabeledPositions.Florac
    ));
    public static readonly ImmutableList<Trip> AllTrips = ImmutableList.Create(
        MendeFlorac,
        BlajouxFlorac,
        BlajouxMende
    );
}