//! Preuve de covoiturage d'un couple conducteur/passager, au sens des classes du registre national :
//! A, l'opérateur atteste la mise en relation ; B, en plus, le trajet d'un des deux occupants ;
//! C, le trajet des deux occupants et leur identité distincte.
//!
//! Le trajet d'un occupant est attesté quand il a déclaré sur son propre téléphone le début et la fin
//! de son trajet, chaque fois avec une position. L'identité distincte tient aux comptes : un compte
//! par numéro de téléphone, et le conducteur ne peut pas s'inscrire comme passager de son trajet.

use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::{Value, json};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::error::Result;
use crate::trip::model::{GestureKind, GestureRow, PositionStatus, ProofClass};
use crate::trip::rules::{END_CLOSES_AFTER_SECONDS, indicative_contribution_cents};

/// Contrôle de vraisemblance : une position déclarée à plus de 2 km de l'arrêt attendu est signalée
/// dans la preuve, sans refuser le geste ni changer la classe.
pub const FAR_FROM_STOP_METERS: i32 = 2_000;
/// De même pour un trajet déclaré terminé moins d'une minute après son début.
pub const MIN_PLAUSIBLE_DURATION_SECONDS: i64 = 60;

#[derive(Debug, Clone, Copy, Default)]
pub struct Occupant<'a> {
    pub start: Option<&'a GestureRow>,
    pub end: Option<&'a GestureRow>,
}

impl<'a> Occupant<'a> {
    pub fn of(gestures: &'a [GestureRow], user_id: &Uuid) -> Self {
        let find = |kind| {
            gestures
                .iter()
                .find(|gesture| &gesture.user_id == user_id && gesture.kind == kind)
        };
        Occupant {
            start: find(GestureKind::Start),
            end: find(GestureKind::End),
        }
    }

    fn is_attested(&self) -> bool {
        let has_position = |gesture: Option<&GestureRow>| {
            gesture.is_some_and(|gesture| gesture.position_status == PositionStatus::Granted)
        };
        has_position(self.start) && has_position(self.end)
    }

    fn warnings(&self, who: &str) -> Vec<String> {
        let mut warnings = Vec::new();
        for (gesture, name) in [(self.start, "Start"), (self.end, "End")] {
            if gesture.is_some_and(is_far_from_stop) {
                warnings.push(format!("{who}{name}FarFromStop"));
            }
        }
        if let (Some(start), Some(end)) = (self.start, self.end)
            && (end.recorded_at - start.recorded_at).num_seconds() < MIN_PLAUSIBLE_DURATION_SECONDS
        {
            warnings.push(format!("{who}TripTooShort"));
        }
        warnings
    }

    fn detail(&self) -> Value {
        json!({
            "attested": self.is_attested(),
            "start": self.start.map(gesture_detail),
            "end": self.end.map(gesture_detail),
        })
    }
}

#[derive(Debug, PartialEq)]
pub struct Proof {
    pub class: ProofClass,
    pub detail: Value,
}

pub fn assess(driver: Occupant, passenger: Occupant, booked_at: DateTime<Utc>) -> Proof {
    let class = match (driver.is_attested(), passenger.is_attested()) {
        (true, true) => ProofClass::C,
        (true, false) | (false, true) => ProofClass::B,
        (false, false) => ProofClass::A,
    };
    let mut warnings = driver.warnings("Driver");
    warnings.extend(passenger.warnings("Passenger"));

    Proof {
        class,
        detail: json!({
            "connection": { "attested": true, "booked_at": booked_at },
            "driver": driver.detail(),
            "passenger": passenger.detail(),
            "distinct_identities": true,
            "warnings": warnings,
            "far_from_stop_meters": FAR_FROM_STOP_METERS,
        }),
    }
}

fn is_far_from_stop(gesture: &GestureRow) -> bool {
    gesture
        .distance_to_stop_meters
        .is_some_and(|distance| distance > FAR_FROM_STOP_METERS)
}

fn gesture_detail(gesture: &GestureRow) -> Value {
    json!({
        "recorded_at": gesture.recorded_at,
        "position_status": gesture.position_status,
        "accuracy_meters": gesture.accuracy_meters,
        "distance_to_stop_meters": gesture.distance_to_stop_meters,
        "far_from_stop": is_far_from_stop(gesture),
    })
}

pub async fn find_gestures(db: &PgPool, trip_id: &Uuid) -> Result<Vec<GestureRow>> {
    let gestures = sqlx::query_as::<_, GestureRow>(
        r#"
            SELECT user_id, kind, recorded_at, position_status, accuracy_meters, distance_to_stop_meters
            FROM trip_event
            WHERE trip_id = $1
            ORDER BY recorded_at
        "#,
    )
    .bind(trip_id)
    .fetch_all(db)
    .await?;
    Ok(gestures)
}

/// Recalcule, pour chaque passager inscrit, la classe de preuve, son détail et le partage de frais indicatif.
/// Appelé après chaque inscription, désinscription et geste.
pub async fn refresh(db: &PgPool, trip_id: &Uuid) -> Result<()> {
    let driver_id: Uuid = sqlx::query_scalar("SELECT driver_id FROM trip WHERE id = $1")
        .bind(trip_id)
        .fetch_one(db)
        .await?;
    let passengers: Vec<(Uuid, DateTime<Utc>, i32)> = sqlx::query_as(
        r#"
            SELECT user_id, created_at, distance_meters
            FROM trip_member
            WHERE trip_id = $1
              AND canceled_at IS NULL
        "#,
    )
    .bind(trip_id)
    .fetch_all(db)
    .await?;
    let gestures = find_gestures(db, trip_id).await?;
    let driver = Occupant::of(&gestures, &driver_id);

    for (passenger_id, booked_at, distance_meters) in &passengers {
        let proof = assess(driver, Occupant::of(&gestures, passenger_id), *booked_at);
        sqlx::query(
            r#"
                UPDATE trip_member
                SET proof_class = $3,
                    proof_detail = $4,
                    proof_computed_at = NOW(),
                    indicative_contribution_cents = $5
                WHERE trip_id = $1
                  AND user_id = $2
            "#,
        )
        .bind(trip_id)
        .bind(passenger_id)
        .bind(proof.class)
        .bind(&proof.detail)
        .bind(indicative_contribution_cents(
            *distance_meters,
            passengers.len() as i64,
        ))
        .execute(db)
        .await?;
    }
    Ok(())
}

#[derive(Debug, FromRow)]
struct ExportRow {
    trip_id: Uuid,
    liane_id: Uuid,
    planned_departure_time: DateTime<Utc>,
    driver_id: Uuid,
    driver_phone: String,
    passenger_id: Uuid,
    passenger_phone: String,
    seat_count: i32,
    distance_meters: i32,
    proof_class: ProofClass,
    proof_detail: Option<Value>,
    indicative_contribution_cents: Option<i32>,
    contribution_cents: Option<i32>,
    driver_revenue_cents: Option<i32>,
    driver_start_at: Option<DateTime<Utc>>,
    driver_start_lat: Option<f64>,
    driver_start_lng: Option<f64>,
    driver_end_at: Option<DateTime<Utc>>,
    driver_end_lat: Option<f64>,
    driver_end_lng: Option<f64>,
    passenger_start_at: Option<DateTime<Utc>>,
    passenger_start_lat: Option<f64>,
    passenger_start_lng: Option<f64>,
    passenger_end_at: Option<DateTime<Utc>>,
    passenger_end_lat: Option<f64>,
    passenger_end_lng: Option<f64>,
}

/// Un couple conducteur/passager, au plus près du schéma « journey » du registre de preuve de
/// covoiturage : `start` et `end` sont ceux du passager, les montants sont en centimes.
/// `contribution` et `revenue` restent nuls tant qu'il n'y a pas de paiement ; ce qui n'appartient
/// pas au schéma du registre est regroupé dans `liane`.
#[derive(Debug, Serialize)]
pub struct ExportedJourney {
    pub operator_journey_id: String,
    pub operator_trip_id: Uuid,
    pub operator_class: ProofClass,
    pub start: Option<TimePlace>,
    pub end: Option<TimePlace>,
    pub distance: i32,
    pub driver: ExportedDriver,
    pub passenger: ExportedPassenger,
    pub incentives: Vec<Value>,
    pub liane: ExportedExtras,
}

#[derive(Debug, Clone, Serialize)]
pub struct TimePlace {
    pub datetime: DateTime<Utc>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct ExportedIdentity {
    pub operator_user_id: Uuid,
    pub phone: String,
}

#[derive(Debug, Serialize)]
pub struct ExportedDriver {
    pub identity: ExportedIdentity,
    pub start: Option<TimePlace>,
    pub end: Option<TimePlace>,
    pub revenue: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct ExportedPassenger {
    pub identity: ExportedIdentity,
    pub start: Option<TimePlace>,
    pub end: Option<TimePlace>,
    pub seats: i32,
    pub contribution: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct ExportedExtras {
    pub liane_id: Uuid,
    pub planned_departure_time: DateTime<Utc>,
    pub indicative_contribution_cents: Option<i32>,
    pub proof_detail: Option<Value>,
}

/// Les couples des trajets terminés ou périmés pour lesquels au moins un des deux occupants a déclaré
/// quelque chose. Contient les numéros de téléphone : réservé à l'export administrateur.
pub async fn export(db: &PgPool, class: Option<ProofClass>) -> Result<Vec<ExportedJourney>> {
    let rows = sqlx::query_as::<_, ExportRow>(
        r#"
            SELECT
                t.id AS trip_id,
                t.liane_id,
                t.departure_time AS planned_departure_time,
                t.driver_id,
                driver.phone AS driver_phone,
                tm.user_id AS passenger_id,
                passenger.phone AS passenger_phone,
                tm.seat_count,
                tm.distance_meters,
                tm.proof_class,
                tm.proof_detail,
                tm.indicative_contribution_cents,
                tm.contribution_cents,
                tm.driver_revenue_cents,
                ds.recorded_at AS driver_start_at, ds.lat AS driver_start_lat, ds.lng AS driver_start_lng,
                de.recorded_at AS driver_end_at, de.lat AS driver_end_lat, de.lng AS driver_end_lng,
                ps.recorded_at AS passenger_start_at, ps.lat AS passenger_start_lat, ps.lng AS passenger_start_lng,
                pe.recorded_at AS passenger_end_at, pe.lat AS passenger_end_lat, pe.lng AS passenger_end_lng
            FROM trip_member tm
            INNER JOIN trip t ON t.id = tm.trip_id
            INNER JOIN "user" driver ON driver.id = t.driver_id
            INNER JOIN "user" passenger ON passenger.id = tm.user_id
            LEFT JOIN trip_event ds ON ds.trip_id = t.id AND ds.user_id = t.driver_id AND ds.kind = 'Start'
            LEFT JOIN trip_event de ON de.trip_id = t.id AND de.user_id = t.driver_id AND de.kind = 'End'
            LEFT JOIN trip_event ps ON ps.trip_id = t.id AND ps.user_id = tm.user_id AND ps.kind = 'Start'
            LEFT JOIN trip_event pe ON pe.trip_id = t.id AND pe.user_id = tm.user_id AND pe.kind = 'End'
            WHERE tm.canceled_at IS NULL
              AND tm.proof_class IS NOT NULL
              AND ($1::varchar IS NULL OR tm.proof_class = $1)
              AND (
                  t.state = 'Finished'
                  OR (t.state <> 'Canceled' AND t.departure_time < NOW() - make_interval(secs => $2))
              )
              AND (ds.id IS NOT NULL OR ps.id IS NOT NULL)
            ORDER BY t.departure_time, t.id, tm.created_at
        "#,
    )
    .bind(class)
    .bind(END_CLOSES_AFTER_SECONDS as f64)
    .fetch_all(db)
    .await?;

    Ok(rows.into_iter().map(to_journey).collect())
}

fn to_journey(row: ExportRow) -> ExportedJourney {
    let time_place =
        |at: Option<DateTime<Utc>>, lat, lon| at.map(|datetime| TimePlace { datetime, lat, lon });
    let passenger_start = time_place(
        row.passenger_start_at,
        row.passenger_start_lat,
        row.passenger_start_lng,
    );
    let passenger_end = time_place(
        row.passenger_end_at,
        row.passenger_end_lat,
        row.passenger_end_lng,
    );

    ExportedJourney {
        operator_journey_id: format!("{}:{}", row.trip_id, row.passenger_id),
        operator_trip_id: row.trip_id,
        operator_class: row.proof_class,
        start: passenger_start.clone(),
        end: passenger_end.clone(),
        distance: row.distance_meters,
        driver: ExportedDriver {
            identity: ExportedIdentity {
                operator_user_id: row.driver_id,
                phone: row.driver_phone,
            },
            start: time_place(
                row.driver_start_at,
                row.driver_start_lat,
                row.driver_start_lng,
            ),
            end: time_place(row.driver_end_at, row.driver_end_lat, row.driver_end_lng),
            revenue: row.driver_revenue_cents,
        },
        passenger: ExportedPassenger {
            identity: ExportedIdentity {
                operator_user_id: row.passenger_id,
                phone: row.passenger_phone,
            },
            start: passenger_start,
            end: passenger_end,
            seats: row.seat_count,
            contribution: row.contribution_cents,
        },
        incentives: Vec::new(),
        liane: ExportedExtras {
            liane_id: row.liane_id,
            planned_departure_time: row.planned_departure_time,
            indicative_contribution_cents: row.indicative_contribution_cents,
            proof_detail: row.proof_detail,
        },
    }
}

#[cfg(test)]
mod tests {
    use chrono::{Duration, TimeZone};

    use super::*;

    fn gesture(
        kind: GestureKind,
        minute: i64,
        status: PositionStatus,
        distance: Option<i32>,
    ) -> GestureRow {
        GestureRow {
            user_id: Uuid::nil(),
            kind,
            recorded_at: Utc.with_ymd_and_hms(2026, 11, 16, 6, 30, 0).unwrap()
                + Duration::minutes(minute),
            position_status: status,
            accuracy_meters: distance.map(|_| 12.0),
            distance_to_stop_meters: distance,
        }
    }

    fn located(kind: GestureKind, minute: i64) -> GestureRow {
        gesture(kind, minute, PositionStatus::Granted, Some(80))
    }

    fn class_of(driver: (&[GestureRow], Uuid), passenger: (&[GestureRow], Uuid)) -> Proof {
        assess(
            Occupant::of(driver.0, &driver.1),
            Occupant::of(passenger.0, &passenger.1),
            Utc::now(),
        )
    }

    #[test]
    fn both_occupants_attested_with_positions_gives_class_c() {
        let journey = [
            located(GestureKind::Start, 0),
            located(GestureKind::End, 30),
        ];
        let proof = class_of((&journey, Uuid::nil()), (&journey, Uuid::nil()));
        assert_eq!(proof.class, ProofClass::C);
        assert_eq!(proof.detail["driver"]["attested"], true);
        assert_eq!(proof.detail["passenger"]["attested"], true);
        assert_eq!(proof.detail["warnings"], json!([]));
    }

    #[test]
    fn a_single_attested_occupant_gives_class_b() {
        let complete = [
            located(GestureKind::Start, 0),
            located(GestureKind::End, 30),
        ];
        let without_position = [
            located(GestureKind::Start, 0),
            gesture(GestureKind::End, 30, PositionStatus::Denied, None),
        ];
        let unfinished = [located(GestureKind::Start, 0)];

        for incomplete in [&without_position[..], &unfinished[..], &[]] {
            let proof = class_of((&complete, Uuid::nil()), (incomplete, Uuid::nil()));
            assert_eq!(proof.class, ProofClass::B);
            let proof = class_of((incomplete, Uuid::nil()), (&complete, Uuid::nil()));
            assert_eq!(proof.class, ProofClass::B);
        }
    }

    #[test]
    fn without_any_attested_occupant_only_the_connection_remains() {
        let denied = [
            gesture(GestureKind::Start, 0, PositionStatus::Denied, None),
            gesture(GestureKind::End, 30, PositionStatus::Unavailable, None),
        ];
        let proof = class_of((&denied, Uuid::nil()), (&[], Uuid::nil()));
        assert_eq!(proof.class, ProofClass::A);
        assert_eq!(proof.detail["connection"]["attested"], true);
        assert_eq!(proof.detail["driver"]["start"]["position_status"], "Denied");
        assert!(proof.detail["passenger"]["start"].is_null());
    }

    #[test]
    fn implausible_declarations_are_flagged_without_changing_the_class() {
        let driver = [
            located(GestureKind::Start, 0),
            gesture(GestureKind::End, 30, PositionStatus::Granted, Some(2_001)),
        ];
        let passenger = [
            gesture(GestureKind::Start, 5, PositionStatus::Granted, Some(2_000)),
            GestureRow {
                recorded_at: located(GestureKind::Start, 5).recorded_at + Duration::seconds(59),
                ..located(GestureKind::End, 5)
            },
        ];
        let proof = class_of((&driver, Uuid::nil()), (&passenger, Uuid::nil()));
        assert_eq!(proof.class, ProofClass::C);
        assert_eq!(
            proof.detail["warnings"],
            json!(["DriverEndFarFromStop", "PassengerTripTooShort"])
        );
        assert_eq!(proof.detail["driver"]["end"]["far_from_stop"], true);
        assert_eq!(proof.detail["passenger"]["start"]["far_from_stop"], false);
    }

    #[test]
    fn gestures_are_matched_to_their_author() {
        let driver_id = Uuid::now_v7();
        let passenger_id = Uuid::now_v7();
        let gestures = [
            GestureRow {
                user_id: driver_id,
                ..located(GestureKind::Start, 0)
            },
            GestureRow {
                user_id: driver_id,
                ..located(GestureKind::End, 30)
            },
            GestureRow {
                user_id: passenger_id,
                ..located(GestureKind::Start, 5)
            },
        ];
        let proof = class_of((&gestures, driver_id), (&gestures, passenger_id));
        assert_eq!(proof.class, ProofClass::B);
        assert_eq!(proof.detail["passenger"]["attested"], false);
    }
}
