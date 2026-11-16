use axum::extract::Path;
use axum::{Extension, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::model::AuthUser;
use crate::error::{AppError, Result};
use crate::user::model::{PublicUser, UpdateUser, User};
use crate::notification::Notifier;
use crate::user::{deletion, service};

pub async fn get_me(auth: AuthUser, Extension(db): Extension<PgPool>) -> Result<Json<User>> {
    let user = service::find(&db, &auth.id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(user))
}

pub async fn update_me(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Json(update): Json<UpdateUser>,
) -> Result<Json<User>> {
    let user = service::update(&db, &auth.id, &update)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(user))
}

pub async fn get_user(
    _auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<PublicUser>> {
    let user = service::find_public(&db, &id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(user))
}

pub async fn delete_me(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
) -> Result<()> {
    deletion::delete_account(&db, &notifier, &auth.id).await
}
