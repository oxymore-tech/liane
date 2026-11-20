use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum RallyingPointKind {
    CarpoolArea,
    HighwayExit,
    Parking,
    Supermarket,
    RelayParking,
    AbandonedRoad,
    AutoStop,
    TownHall,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RallyingPoint {
    pub id: Uuid,
    pub label: String,
    pub lat: f64,
    pub lng: f64,
    pub kind: RallyingPointKind,
    pub address: String,
    pub zip_code: String,
    pub city: String,
    pub place_count: Option<i32>,
    pub is_active: bool,
}

/// Un point vu par l'administration. `source` : origine du point (`bnlc`, `mairie`…), absente s'il a été
/// créé à la main. `edited_at` : dernière création ou modification à la main. `lianes` : noms des lianes
/// qui s'y arrêtent.
#[derive(Debug, Serialize, FromRow)]
pub struct AdminRallyingPoint {
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub point: RallyingPoint,
    pub source: Option<String>,
    pub edited_at: Option<DateTime<Utc>>,
    pub lianes: Vec<String>,
}

/// Un type inconnu est gardé tel quel pour être refusé avec `InvalidKind`, comme les autres champs.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum KindInput {
    Known(RallyingPointKind),
    Unknown(String),
}

#[derive(Debug, Deserialize)]
pub struct RallyingPointInput {
    pub label: String,
    pub lat: f64,
    pub lng: f64,
    pub kind: KindInput,
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub zip_code: String,
    #[serde(default)]
    pub city: String,
    #[serde(default)]
    pub place_count: Option<i32>,
    #[serde(default = "active_by_default")]
    pub is_active: bool,
}

fn active_by_default() -> bool {
    true
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub search: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SnapQuery {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Deserialize)]
pub struct BboxQuery {
    pub lat: f64,
    pub lng: f64,
    pub lat2: f64,
    pub lng2: f64,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateQuery {
    pub source: Option<String>,
}
