use axum::Extension;
use axum::Json;
use axum::extract::Query;
use sqlx::PgPool;

use crate::auth::extractor::AdminUser;
use crate::error::{AppError, Result};
use crate::rallying_point::generate::{self, SyncReport};
use crate::rallying_point::model::{
    BboxQuery, GenerateQuery, RallyingPoint, SearchQuery, SnapQuery,
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
