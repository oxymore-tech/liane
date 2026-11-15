use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::notification::push::PushSubscription;

const MAX_ENDPOINT_LENGTH: usize = 2_000;
const MAX_KEY_LENGTH: usize = 200;

/// Un appareil déjà abonné par un autre compte (téléphone partagé) passe au compte courant.
pub async fn save(
    db: &PgPool,
    user_id: &Uuid,
    endpoint: &str,
    p256dh: &str,
    auth: &str,
) -> Result<()> {
    let is_valid = endpoint.starts_with("https://")
        && endpoint.len() <= MAX_ENDPOINT_LENGTH
        && !p256dh.is_empty()
        && p256dh.len() <= MAX_KEY_LENGTH
        && !auth.is_empty()
        && auth.len() <= MAX_KEY_LENGTH;
    if !is_valid {
        return Err(AppError::BadRequest);
    }

    sqlx::query(
        r#"
            INSERT INTO push_subscription (user_id, endpoint, p256dh, auth)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (endpoint) DO UPDATE
                SET user_id = $1,
                    p256dh = $3,
                    auth = $4
        "#,
    )
    .bind(user_id)
    .bind(endpoint)
    .bind(p256dh)
    .bind(auth)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn delete(db: &PgPool, user_id: &Uuid, endpoint: &str) -> Result<bool> {
    let deleted = sqlx::query("DELETE FROM push_subscription WHERE user_id = $1 AND endpoint = $2")
        .bind(user_id)
        .bind(endpoint)
        .execute(db)
        .await?;
    Ok(deleted.rows_affected() > 0)
}

pub async fn delete_by_id(db: &PgPool, id: &Uuid) -> Result<()> {
    sqlx::query("DELETE FROM push_subscription WHERE id = $1")
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn find_for_users(db: &PgPool, user_ids: &[Uuid]) -> Result<Vec<PushSubscription>> {
    let subscriptions = sqlx::query_as::<_, PushSubscription>(
        r#"
            SELECT id, user_id, endpoint, p256dh, auth
            FROM push_subscription
            WHERE user_id = ANY($1)
            ORDER BY created_at
        "#,
    )
    .bind(user_ids)
    .fetch_all(db)
    .await?;
    Ok(subscriptions)
}
