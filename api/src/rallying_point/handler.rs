use axum::Extension;
use axum::Json;
use axum::extract::{Path, Query};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::extractor::AdminUser;
use crate::config::Config;
use crate::error::{AppError, Result};
use crate::rallying_point::generate::{self, SyncReport};
use crate::rallying_point::model::{
    AdminRallyingPoint, BboxQuery, GenerateQuery, RallyingPoint, RallyingPointInput, SearchQuery,
    SnapQuery,
};
use crate::rallying_point::service;

pub async fn search(
    Extension(db): Extension<PgPool>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<Vec<RallyingPoint>>> {
    let search = q.search.unwrap_or_default();
    let lat = q.lat.unwrap_or(0.0);
    let lng = q.lng.unwrap_or(0.0);
    let limit = q.limit.unwrap_or(20).min(100);
    let results = service::search(&db, &search, lat, lng, limit).await?;
    Ok(Json(results))
}

pub async fn snap(
    Extension(db): Extension<PgPool>,
    Query(q): Query<SnapQuery>,
) -> Result<Json<RallyingPoint>> {
    let result = service::snap(&db, q.lat, q.lng)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(result))
}

pub async fn bbox(
    Extension(db): Extension<PgPool>,
    Query(q): Query<BboxQuery>,
) -> Result<Json<Vec<RallyingPoint>>> {
    let limit = q.limit.unwrap_or(200).min(1000);
    let results = service::bbox(&db, q.lat, q.lng, q.lat2, q.lng2, limit).await?;
    Ok(Json(results))
}

pub async fn generate_points(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Query(q): Query<GenerateQuery>,
) -> Result<Json<SyncReport>> {
    let test_only = q.source.as_deref() == Some("test");
    let report = generate::generate(&db, test_only).await?;
    Ok(Json(report))
}

pub async fn admin_search(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<Vec<AdminRallyingPoint>>> {
    let search = q.search.unwrap_or_default();
    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    let results = service::admin_search(&db, search.trim(), q.lat, q.lng, limit).await?;
    Ok(Json(results))
}

pub async fn get_one(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<AdminRallyingPoint>> {
    let point = service::find_admin(&db, &id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(point))
}

pub async fn create(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Json(input): Json<RallyingPointInput>,
) -> Result<Json<AdminRallyingPoint>> {
    let point = service::create(&db, &input).await?;
    Ok(Json(point))
}

pub async fn update(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
    Path(id): Path<Uuid>,
    Json(input): Json<RallyingPointInput>,
) -> Result<Json<AdminRallyingPoint>> {
    let point = service::update(&db, &config.osrm_url, &id, &input)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(point))
}
