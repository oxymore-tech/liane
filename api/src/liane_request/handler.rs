use axum::extract::Path;
use axum::{Extension, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::model::AuthUser;
use crate::error::{AppError, Result};
use crate::liane_request::model::{LianeRequest, LianeRequestInput};
use crate::liane_request::service;

pub async fn list(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
) -> Result<Json<Vec<LianeRequest>>> {
    let requests = service::list(&db, &auth.id).await?;
    Ok(Json(requests))
}

pub async fn get_one(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<LianeRequest>> {
    let request = service::find(&db, &auth.id, &id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(request))
}

pub async fn create(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Json(input): Json<LianeRequestInput>,
) -> Result<Json<LianeRequest>> {
    let request = service::create(&db, &auth.id, &input).await?;
    Ok(Json(request))
}

pub async fn update(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(input): Json<LianeRequestInput>,
) -> Result<Json<LianeRequest>> {
    let request = service::update(&db, &auth.id, &id, &input)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(request))
}

pub async fn delete(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<()> {
    if service::delete(&db, &auth.id, &id).await? {
        Ok(())
    } else {
        Err(AppError::NotFound)
    }
}
