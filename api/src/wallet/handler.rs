use axum::extract::Path;
use axum::{Extension, Json};
use sqlx::PgPool;

use crate::auth::model::AuthUser;
use crate::config::Config;
use crate::error::{AppError, Result};
use crate::wallet::model::{Month, Statement, Wallet};
use crate::wallet::service;

pub async fn find(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
) -> Result<Json<Wallet>> {
    let wallet = service::find(&db, config.cost_share_cents_per_km, &auth.id).await?;
    Ok(Json(wallet))
}

pub async fn open(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
) -> Result<Json<Wallet>> {
    let wallet = service::open(&db, config.cost_share_cents_per_km, &auth.id).await?;
    Ok(Json(wallet))
}

pub async fn close(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
) -> Result<Json<Wallet>> {
    let wallet = service::close(&db, config.cost_share_cents_per_km, &auth.id).await?;
    Ok(Json(wallet))
}

pub async fn find_statement(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(month): Path<String>,
) -> Result<Json<Statement>> {
    let month = Month::parse(&month).ok_or(AppError::BadRequest)?;
    let statement = service::find_statement(&db, &auth.id, month).await?;
    Ok(Json(statement))
}
