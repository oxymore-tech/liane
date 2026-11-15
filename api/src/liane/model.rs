use chrono::{DateTime, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::liane::routing::RouteSource;
use crate::liane_request::model::WeekDays;
use crate::rallying_point::model::RallyingPoint;
use crate::user::model::{Gender, PublicUser};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum Direction {
    Outbound,
    Return,
    Both,
}

#[derive(Debug, FromRow)]
pub struct LianeRow {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub is_active: bool,
    pub route: Option<String>,
    pub route_source: RouteSource,
    pub distance_meters: i32,
    pub duration_seconds: Option<i32>,
    pub member_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub struct LianeStopRow {
    pub liane_id: Uuid,
    pub distance_meters: i32,
    #[sqlx(flatten)]
    pub point: RallyingPoint,
}

/// `route_source` vaut `Straight` quand le tracé est la ligne droite entre les arrêts, faute de
/// réponse du calcul d'itinéraire : distances à vol d'oiseau, pas de durée.
/// `stop_distances` donne, pour chaque arrêt de `stops`, sa distance en mètres depuis le premier.
#[derive(Debug, Clone, Serialize)]
pub struct Liane {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub is_active: bool,
    pub stops: Vec<RallyingPoint>,
    pub stop_distances: Vec<i32>,
    pub route: Option<serde_json::Value>,
    pub route_source: RouteSource,
    pub distance_meters: i32,
    pub duration_seconds: Option<i32>,
    pub member_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct LianeDetail {
    #[serde(flatten)]
    pub liane: Liane,
    pub schedule: Vec<DaySchedule>,
    pub membership: Option<Membership>,
    pub members: Option<Vec<LianeMember>>,
}

/// `day` vaut 0 pour lundi, comme l'indice dans `week_days`.
#[derive(Debug, Serialize, FromRow)]
pub struct DaySchedule {
    pub day: i32,
    pub outbound_members: i64,
    pub outbound_drivers: i64,
    pub return_members: i64,
    pub return_drivers: i64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Membership {
    pub board_stop_id: Uuid,
    pub alight_stop_id: Uuid,
    pub week_days: WeekDays,
    pub direction: Direction,
    pub can_drive: bool,
    pub outbound_time: Option<NaiveTime>,
    pub return_time: Option<NaiveTime>,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct MembershipInput {
    pub board_stop_id: Uuid,
    pub alight_stop_id: Uuid,
    pub week_days: WeekDays,
    pub direction: Direction,
    pub can_drive: bool,
    #[serde(default)]
    pub outbound_time: Option<NaiveTime>,
    #[serde(default)]
    pub return_time: Option<NaiveTime>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct LianeMember {
    #[sqlx(flatten)]
    pub user: PublicUser,
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub membership: Membership,
}

#[derive(Debug, Serialize)]
/// `unread_count` : messages des autres membres arrivés depuis la dernière lecture du fil.
pub struct MyLiane {
    #[serde(flatten)]
    pub liane: Liane,
    pub membership: Membership,
    pub unread_count: i64,
}

#[derive(Debug, FromRow)]
pub struct MyMembershipRow {
    pub liane_id: Uuid,
    #[sqlx(flatten)]
    pub membership: Membership,
}

#[derive(Debug, Deserialize)]
pub struct LianeInput {
    pub name: String,
    pub stop_ids: Vec<Uuid>,
    #[serde(default = "active_by_default")]
    pub is_active: bool,
}

fn active_by_default() -> bool {
    true
}

#[derive(Debug, Deserialize)]
pub struct RoutePreviewInput {
    pub stop_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct RoutePreview {
    pub route: serde_json::Value,
    pub route_source: RouteSource,
    pub distance_meters: i32,
    pub duration_seconds: Option<i32>,
    pub stop_distances: Vec<i32>,
}

/// Bilan du recalcul des tracés restés en ligne droite.
#[derive(Debug, Serialize)]
pub struct RouteRecomputeReport {
    pub recomputed: usize,
    pub still_straight: usize,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub from_lat: f64,
    pub from_lng: f64,
    pub to_lat: f64,
    pub to_lng: f64,
    pub radius: Option<f64>,
}

/// `radius` en mètres (50 par défaut, 5 000 au plus).
#[derive(Debug, Deserialize)]
pub struct NearQuery {
    pub lat: f64,
    pub lng: f64,
    pub radius: Option<f64>,
}

#[derive(Debug, FromRow)]
pub struct SearchRow {
    pub liane_id: Uuid,
    pub from_stop_id: Uuid,
    pub to_stop_id: Uuid,
    pub from_ordinal: i32,
    pub to_ordinal: i32,
    pub from_distance_meters: f64,
    pub to_distance_meters: f64,
}

/// `from_stop_id` et `to_stop_id` sont les arrêts les plus proches du départ et de l'arrivée
/// recherchés ; `direction` indique si ce trajet suit l'ordre des arrêts (aller) ou l'inverse.
#[derive(Debug, Serialize)]
pub struct LianeSearchResult {
    pub liane: Liane,
    pub from_stop_id: Uuid,
    pub to_stop_id: Uuid,
    pub direction: Direction,
    /// Distance le long du tracé entre l'arrêt de montée et l'arrêt de descente suggérés.
    pub section_distance_meters: i32,
    pub from_distance_meters: f64,
    pub to_distance_meters: f64,
}

#[derive(Debug, Deserialize)]
pub struct ReportInput {
    pub reason: String,
}

#[derive(Debug, FromRow)]
pub struct ReportRow {
    pub id: Uuid,
    pub liane_id: Uuid,
    pub liane_name: String,
    pub liane_slug: String,
    pub reported_id: Uuid,
    pub reported_pseudo: Option<String>,
    pub reporter_id: Uuid,
    pub reporter_pseudo: Option<String>,
    pub reason: String,
    pub created_at: DateTime<Utc>,
    pub reported_is_member: bool,
}

#[derive(Debug, Serialize)]
pub struct Report {
    pub id: Uuid,
    pub liane: ReportedLiane,
    pub reported: ReportUser,
    pub reporter: ReportUser,
    pub reason: String,
    pub created_at: DateTime<Utc>,
    pub reported_is_member: bool,
}

#[derive(Debug, Serialize)]
pub struct ReportedLiane {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Serialize)]
pub struct ReportUser {
    pub id: Uuid,
    pub pseudo: Option<String>,
}

#[derive(Debug, FromRow)]
pub struct MatchRow {
    pub liane_request_id: Uuid,
    pub user_id: Uuid,
    pub pseudo: Option<String>,
    pub gender: Gender,
    pub picture_url: Option<String>,
    pub name: String,
    pub waypoints: Vec<Uuid>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub week_days: WeekDays,
    pub common_week_days: WeekDays,
    pub score: f64,
}

/// Ce que l'on peut proposer pour une demande de trajet : les lianes qui la desservent
/// et les demandes d'autres utilisateurs qui s'en rapprochent. Rien n'est créé automatiquement.
#[derive(Debug, Serialize)]
pub struct LianeRequestMatches {
    pub lianes: Vec<LianeSearchResult>,
    pub requests: Vec<RequestMatch>,
}

#[derive(Debug, Serialize)]
pub struct RequestMatch {
    pub score: f64,
    pub common_week_days: WeekDays,
    pub request: MatchedRequest,
}

#[derive(Debug, Serialize)]
pub struct MatchedRequest {
    pub id: Uuid,
    pub name: String,
    pub user: PublicUser,
    pub waypoints: Vec<RallyingPoint>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub week_days: WeekDays,
}
