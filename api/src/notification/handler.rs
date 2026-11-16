use axum::{Extension, Json};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::auth::model::AuthUser;
use crate::config::Config;
use crate::error::{AppError, Result};
use crate::notification::subscription;

/// `vapid_public_key` absente : les notifications ne sont pas proposées.
#[derive(Debug, Serialize)]
pub struct PushConfig {
    pub vapid_public_key: Option<String>,
}

/// Les champs de `PushSubscription.toJSON()` du navigateur.
#[derive(Debug, Deserialize)]
pub struct SubscriptionInput {
    pub endpoint: String,
    pub keys: SubscriptionKeys,
}

#[derive(Debug, Deserialize)]
pub struct SubscriptionKeys {
    pub p256dh: String,
    pub auth: String,
}

#[derive(Debug, Deserialize)]
pub struct UnsubscribeInput {
    pub endpoint: String,
}

pub async fn config(Extension(config): Extension<Config>) -> Json<PushConfig> {
    Json(PushConfig {
        vapid_public_key: config.vapid_public_key,
    })
}

pub async fn subscribe(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Json(input): Json<SubscriptionInput>,
) -> Result<()> {
    subscription::save(
        &db,
        &auth.id,
        &input.endpoint,
        &input.keys.p256dh,
        &input.keys.auth,
    )
    .await
}

pub async fn unsubscribe(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Json(input): Json<UnsubscribeInput>,
) -> Result<()> {
    if subscription::delete(&db, &auth.id, &input.endpoint).await? {
        Ok(())
    } else {
        Err(AppError::NotFound)
    }
}
