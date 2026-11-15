use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::user::model::Gender;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum TripDirection {
    Outbound,
    Return,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum TripState {
    Planned,
    Started,
    Finished,
    Canceled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum TripRole {
    Driver,
    Passenger,
}

/// Début (`Start`) ou fin (`End`) du trajet d'un occupant : « Je suis parti » / « Je suis arrivé »
/// pour le conducteur, « Je suis monté » / « Je suis descendu » pour un passager.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum GestureKind {
    Start,
    End,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum PositionStatus {
    Granted,
    Denied,
    Unavailable,
}

/// Classe de preuve d'un couple conducteur/passager au sens du registre de preuve de covoiturage.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize, sqlx::Type,
)]
#[sqlx(type_name = "VARCHAR")]
pub enum ProofClass {
    A,
    B,
    C,
}

/// La classe de preuve dite sans jargon à l'utilisateur : `Full` pour C, `Partial` pour B, `None` pour A.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum Attestation {
    Full,
    Partial,
    None,
}

impl From<ProofClass> for Attestation {
    fn from(class: ProofClass) -> Self {
        match class {
            ProofClass::C => Attestation::Full,
            ProofClass::B => Attestation::Partial,
            ProofClass::A => Attestation::None,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct TripInput {
    pub departure_time: DateTime<Utc>,
    pub direction: TripDirection,
    pub seat_count: i32,
    /// Par défaut, les arrêts de l'adhésion du conducteur, dans le sens du trajet.
    #[serde(default)]
    pub from_stop_id: Option<Uuid>,
    #[serde(default)]
    pub to_stop_id: Option<Uuid>,
}

/// Par défaut, le tronçon de l'adhésion du passager, ramené à celui du conducteur.
#[derive(Debug, Default, Deserialize)]
pub struct BookingInput {
    #[serde(default)]
    pub from_stop_id: Option<Uuid>,
    #[serde(default)]
    pub to_stop_id: Option<Uuid>,
}

/// Sans `position`, le geste est enregistré quand même ; `position_status` dit pourquoi
/// (`Denied` : refusée, `Unavailable` : pas obtenue).
#[derive(Debug, Deserialize)]
pub struct GestureInput {
    pub kind: GestureKind,
    #[serde(default)]
    pub position: Option<PositionInput>,
    #[serde(default)]
    pub position_status: Option<PositionStatus>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
pub struct PositionInput {
    pub lat: f64,
    pub lng: f64,
    #[serde(default)]
    pub accuracy_meters: Option<f32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TripStop {
    pub id: Uuid,
    pub label: String,
    pub city: String,
}

impl TripStop {
    pub fn name(&self) -> &str {
        if self.city.is_empty() {
            &self.label
        } else {
            &self.city
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct TripUser {
    pub id: Uuid,
    pub pseudo: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TripLiane {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, FromRow)]
pub struct TripRow {
    pub id: Uuid,
    pub liane_id: Uuid,
    pub liane_name: String,
    pub liane_slug: String,
    pub driver_id: Uuid,
    pub driver_pseudo: Option<String>,
    pub driver_gender: Gender,
    pub departure_time: DateTime<Utc>,
    pub direction: TripDirection,
    pub from_id: Uuid,
    pub from_label: String,
    pub from_city: String,
    pub to_id: Uuid,
    pub to_label: String,
    pub to_city: String,
    pub seat_count: i32,
    pub passenger_count: i64,
    pub distance_meters: i32,
    pub state: TripState,
    pub viewer_is_passenger: bool,
}

/// `from_stop` et `to_stop` sont le départ et l'arrivée du conducteur, dans le sens du trajet.
/// `is_open` : le trajet est encore à venir ou en cours (ni terminé, ni annulé, ni périmé).
#[derive(Debug, Clone, Serialize)]
pub struct Trip {
    pub id: Uuid,
    pub liane: TripLiane,
    pub driver: TripUser,
    pub departure_time: DateTime<Utc>,
    pub direction: TripDirection,
    pub from_stop: TripStop,
    pub to_stop: TripStop,
    pub seat_count: i32,
    pub seats_left: i32,
    pub distance_meters: i32,
    pub state: TripState,
    pub is_open: bool,
    pub my_role: Option<TripRole>,
    #[serde(skip)]
    pub driver_is_woman: bool,
}

#[derive(Debug, Serialize)]
pub struct MyTrips {
    pub upcoming: Vec<Trip>,
    pub past: Vec<Trip>,
}

#[derive(Debug, FromRow)]
pub struct PassengerRow {
    pub user_id: Uuid,
    pub pseudo: Option<String>,
    pub from_id: Uuid,
    pub from_label: String,
    pub from_city: String,
    pub to_id: Uuid,
    pub to_label: String,
    pub to_city: String,
    pub distance_meters: i32,
    pub indicative_contribution_cents: Option<i32>,
    pub proof_class: Option<ProofClass>,
    pub proof_detail: Option<serde_json::Value>,
}

/// `attestation` n'est renseignée que pour le conducteur, le passager lui-même et un administrateur.
#[derive(Debug, Serialize)]
pub struct TripPassenger {
    pub user: TripUser,
    pub from_stop: TripStop,
    pub to_stop: TripStop,
    pub distance_meters: i32,
    pub indicative_contribution_cents: Option<i32>,
    pub started_at: Option<DateTime<Utc>>,
    pub ended_at: Option<DateTime<Utc>>,
    pub attestation: Option<Attestation>,
}

#[derive(Debug, Clone, FromRow)]
pub struct GestureRow {
    pub user_id: Uuid,
    pub kind: GestureKind,
    pub recorded_at: DateTime<Utc>,
    pub position_status: PositionStatus,
    pub accuracy_meters: Option<f32>,
    pub distance_to_stop_meters: Option<i32>,
}

/// Un geste de l'utilisateur qui consulte le trajet. La position elle-même n'est jamais renvoyée.
#[derive(Debug, Serialize)]
pub struct MyGesture {
    pub kind: GestureKind,
    pub recorded_at: DateTime<Utc>,
    pub position_status: PositionStatus,
}

/// Quand les gestes sont acceptés, autour de l'heure de départ prévue.
#[derive(Debug, Serialize)]
pub struct GestureWindow {
    pub start_opens_at: DateTime<Utc>,
    pub start_closes_at: DateTime<Utc>,
    pub end_closes_at: DateTime<Utc>,
}

/// `next_gesture` : le geste que l'utilisateur peut faire maintenant, s'il y en a un.
/// `indicative_cents_per_km` : barème du partage de frais indicatif, à diviser entre les occupants.
#[derive(Debug, Serialize)]
pub struct TripDetail {
    #[serde(flatten)]
    pub trip: Trip,
    pub driver_started_at: Option<DateTime<Utc>>,
    pub driver_ended_at: Option<DateTime<Utc>>,
    pub passengers: Vec<TripPassenger>,
    pub my_gestures: Vec<MyGesture>,
    pub next_gesture: Option<GestureKind>,
    pub gesture_window: GestureWindow,
    pub indicative_cents_per_km: i64,
}

#[derive(Debug, Serialize)]
pub struct AdminProof {
    pub passenger: TripUser,
    pub from_stop: TripStop,
    pub to_stop: TripStop,
    pub distance_meters: i32,
    pub indicative_contribution_cents: Option<i32>,
    pub proof_class: Option<ProofClass>,
    pub proof_detail: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct AdminTrip {
    #[serde(flatten)]
    pub trip: Trip,
    pub proofs: Vec<AdminProof>,
}

#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    pub class: Option<ProofClass>,
}
