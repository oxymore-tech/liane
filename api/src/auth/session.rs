//! Sessions en base : la déconnexion, le retrait du droit administrateur et la suppression du
//! compte prennent effet à la requête suivante, sans attendre l'expiration du jeton.

use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{Header, Validation, decode, encode};
use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::auth::model::{AuthUser, Claims};
use crate::config::Keys;
use crate::error::{AppError, Result};

const SESSION_DAYS: i64 = 30;

/// Ouvre une session et renvoie son jeton.
pub async fn open(db: &PgPool, keys: &Keys, user_id: &Uuid) -> Result<String> {
    sqlx::query("DELETE FROM user_session WHERE expires_at < NOW()")
        .execute(db)
        .await?;

    let now = Utc::now();
    let expires_at: DateTime<Utc> = now + Duration::days(SESSION_DAYS);
    let session_id: Uuid = sqlx::query_scalar(
        "INSERT INTO user_session (user_id, expires_at) VALUES ($1, $2) RETURNING id",
    )
    .bind(user_id)
    .bind(expires_at)
    .fetch_one(db)
    .await?;

    let claims = Claims {
        sub: *user_id,
        sid: session_id,
        iat: now.timestamp(),
        exp: expires_at.timestamp(),
    };
    encode(&Header::default(), &claims, &keys.encoding).map_err(AppError::unexpected)
}

/// L'utilisateur du jeton, si le jeton est authentique et si sa session existe encore.
pub async fn find_user(db: &PgPool, keys: &Keys, token: &str) -> Result<Option<AuthUser>> {
    let Ok(token) = decode::<Claims>(token, &keys.decoding, &Validation::default()) else {
        return Ok(None);
    };
    let claims = token.claims;

    let is_admin: Option<bool> = sqlx::query_scalar(
        r#"
            SELECT u.is_admin
            FROM user_session s
            INNER JOIN "user" u ON u.id = s.user_id
            WHERE s.id = $1
              AND s.user_id = $2
              AND s.expires_at > NOW()
              AND u.deleted_at IS NULL
        "#,
    )
    .bind(claims.sid)
    .bind(claims.sub)
    .fetch_optional(db)
    .await?;

    Ok(is_admin.map(|is_admin| AuthUser {
        id: claims.sub,
        is_admin,
        session_id: claims.sid,
    }))
}

pub async fn close(db: &PgPool, session_id: &Uuid) -> Result<()> {
    sqlx::query("DELETE FROM user_session WHERE id = $1")
        .bind(session_id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn close_all(connection: &mut PgConnection, user_id: &Uuid) -> Result<()> {
    sqlx::query("DELETE FROM user_session WHERE user_id = $1")
        .bind(user_id)
        .execute(connection)
        .await?;
    Ok(())
}
