use axum::extract::Path;
use axum::{Extension, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::model::AuthUser;
use crate::error::{AppError, Result};
use crate::liane::model::{CreateLiane, JoinLiane, Liane, LianeRequestState};
use crate::liane::{matching, service};

pub async fn list(auth: AuthUser, Extension(db): Extension<PgPool>) -> Result<Json<Vec<Liane>>> {
    let lianes = service::list(&db, &auth.id).await?;
    Ok(Json(lianes))
}

pub async fn get_one(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Liane>> {
    let liane = service::find(&db, &auth.id, &id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(liane))
}

pub async fn find_matches(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(liane_request_id): Path<Uuid>,
) -> Result<Json<LianeRequestState>> {
    let state = matching::find_state(&db, &auth.id, &liane_request_id).await?;
    Ok(Json(state))
}

pub async fn create(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Json(input): Json<CreateLiane>,
) -> Result<Json<Liane>> {
    let liane = service::create(&db, &auth.id, &input).await?;
    Ok(Json(liane))
}

pub async fn join(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(input): Json<JoinLiane>,
) -> Result<Json<Liane>> {
    let liane = service::join(&db, &auth.id, &id, &input.liane_request_id).await?;
    Ok(Json(liane))
}

pub async fn accept(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path((id, member_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Liane>> {
    let liane = service::accept(&db, &auth.id, &id, &member_id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(liane))
}

pub async fn remove_member(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path((id, member_id)): Path<(Uuid, Uuid)>,
) -> Result<()> {
    if service::remove_member(&db, &auth.id, &id, &member_id).await? {
        Ok(())
    } else {
        Err(AppError::NotFound)
    }
}
