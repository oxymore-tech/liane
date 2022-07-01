using System.Collections.Immutable;
using Liane.Api.Trip;

namespace Liane.Test;

public sealed class Trips
{
    public static readonly Trip Mende_Florac = new Trip(ImmutableList.Create(LabeledPositions.Mende, LabeledPositions.LesBondons_Parking, LabeledPositions.Florac));
    public static readonly Trip Blajoux_Florac = new Trip(ImmutableList.Create(LabeledPositions.Blajoux_Parking, LabeledPositions.Montbrun_En_Bas, LabeledPositions.Florac));
    public static readonly Trip Blajoux_Mende = new Trip(ImmutableList.Create(LabeledPositions.Blajoux_Parking, LabeledPositions.Montbrun_En_Bas, LabeledPositions.Mende));
    public static readonly Trip Florac_LesBondons = new Trip(ImmutableList.Create(LabeledPositions.Florac, LabeledPositions.Cocures, LabeledPositions.LeCrouzet, LabeledPositions.LesBondons_Parking), "CONDUCTEUR_5", 8);
    public static readonly Trip Blajoux_Montbrun_En_Bas_3 = new Trip(ImmutableList.Create(LabeledPositions.Blajoux_Parking, LabeledPositions.Montbrun_En_Bas), "CONDUCTEUR_1", 8);
    public static readonly Trip Blajoux_Montbrun_En_Bas = new Trip(ImmutableList.Create(LabeledPositions.Blajoux_Parking, LabeledPositions.Montbrun_En_Bas), "CONDUCTEUR_1", 10);
    public static readonly Trip Blajoux_Montbrun_En_Bas_2 = new Trip(ImmutableList.Create(LabeledPositions.Blajoux_Parking, LabeledPositions.Montbrun_En_Bas), "CONDUCTEUR_1", 15);
    public static readonly Trip Montbrun_En_Bas_La_Malene = new Trip(ImmutableList.Create(LabeledPositions.Montbrun_En_Bas, LabeledPositions.La_Malene_Parking), "CONDUCTEUR_1", 9);
    public static readonly Trip La_Malene_Severac = new Trip(ImmutableList.Create(LabeledPositions.La_Malene_Parking, LabeledPositions.Severac_dAveyron_Rond_Point), "CONDUCTEUR_1", 10);
    public static readonly Trip Florac_Cocures = new Trip(ImmutableList.Create(LabeledPositions.Florac, LabeledPositions.Cocures), "CONDUCTEUR_5", 8);
    public static readonly Trip Florac_Le_Crouzet = new Trip(ImmutableList.Create(LabeledPositions.Florac, LabeledPositions.Cocures, LabeledPositions.LeCrouzet), "CONDUCTEUR_5", 8);
    public static readonly Trip Cocures_Le_Crouzet = new Trip(ImmutableList.Create(LabeledPositions.Cocures, LabeledPositions.LeCrouzet), "CONDUCTEUR_5", 8);
    public static readonly Trip Prades_La_Malene = new Trip(ImmutableList.Create(LabeledPositions.Prades, LabeledPositions.La_Malene_Parking), "CONDUCTEUR_2", 9);
    public static readonly Trip La_Malene_Severac_2 = new Trip(ImmutableList.Create(LabeledPositions.La_Malene_Parking, LabeledPositions.Severac_dAveyron_Rond_Point), "CONDUCTEUR_2", 10);

    public static readonly Trip Mende_Florac_1 = new Trip(ImmutableList.Create(
        LabeledPositions.Mende, 
        LabeledPositions.Balsiege_Parking_Eglise,
        LabeledPositions.Quezac_Parking,
        LabeledPositions.Ispagnac_Parking,
        LabeledPositions.Florac
    ));
    public static readonly Trip Mende_Florac_2 = new Trip(ImmutableList.Create(
        LabeledPositions.Mende, 
        LabeledPositions.SaintEtienneDuValdonnez_Parking,
        LabeledPositions.Florac
    ));
    public static readonly ImmutableList<Trip> AllTrips = ImmutableList.Create(
        Mende_Florac,
        Blajoux_Florac,
        Blajoux_Mende
    );
}