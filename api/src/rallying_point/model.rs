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

#[derive(Debug, Serialize, Deserialize, FromRow)]
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
