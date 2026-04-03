use chrono::Utc;
use jsonwebtoken::{Header, encode};
use rand::Rng;
use sqlx::PgPool;
use tracing::{info, warn};
use uuid::Uuid;

use crate::auth::model::{AuthRequest, AuthResponse, AuthToken, AuthUser};
use crate::config::Config;
use crate::error::{AppError, Result};

fn normalize_phone(phone: &str) -> String {
    let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
    if let Some(rest) = digits.strip_prefix("0") {
        format!("+33{rest}")
    } else if digits.starts_with("33") {
        format!("+{digits}")
    } else if phone.starts_with('+') {
        phone.to_string()
    } else {
        digits
    }
}

pub async fn send_code(db: &PgPool, config: &Config, phone: &str) -> Result<()> {
    let phone = normalize_phone(phone);

    if config
        .auth_test_account
        .as_ref()
        .is_some_and(|t| normalize_phone(t) == phone)
    {
        return Ok(());
    }

    let code: String = format!("{:06}", rand::rng().random_range(0..1_000_000));

    sqlx::query(
        r#"
        INSERT INTO sms_code (phone, code, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '2 minutes')
        ON CONFLICT (phone) DO UPDATE
            SET code = $2, expires_at = NOW() + INTERVAL '2 minutes', attempts = 0
        "#,
    )
    .bind(&phone)
    .bind(&code)
    .execute(db)
    .await?;

    info!("SMS code for {phone}: {code}");

    Ok(())
}

pub async fn login(db: &PgPool, config: &Config, req: &AuthRequest) -> Result<AuthResponse> {
    let phone = normalize_phone(&req.phone);
    let is_test = is_test_login(config, &phone, &req.code);

    if !is_test {
        verify_code(db, &phone, &req.code).await?;
    }

    let row: Option<(Uuid, bool, bool)> =
        sqlx::query_as(r#"SELECT id, is_admin, is_signed_up FROM "user" WHERE phone = $1"#)
            .bind(&phone)
            .fetch_optional(db)
            .await?;

    let (user_id, is_admin, is_signed_up) = match row {
        Some(r) => r,
        None => {
            let id: (Uuid,) = sqlx::query_as(
                r#"INSERT INTO "user" (phone, is_admin) VALUES ($1, $2) RETURNING id"#,
            )
            .bind(&phone)
            .bind(is_test)
            .fetch_one(db)
            .await?;
            (id.0, is_test, false)
        }
    };

    let auth_user = AuthUser {
        id: user_id,
        is_admin,
        is_signed_up,
        iat: 0,
        exp: 0,
    };

    let token = generate_token(&auth_user, config)?;

    Ok(AuthResponse {
        user: auth_user,
        token: AuthToken {
            access_token: token,
        },
    })
}

pub async fn logout(db: &PgPool, user_id: &Uuid) -> Result<()> {
    sqlx::query(r#"DELETE FROM sms_code WHERE phone = (SELECT phone FROM "user" WHERE id = $1)"#)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(())
}

fn is_test_login(config: &Config, phone: &str, code: &str) -> bool {
    let test_account = config.auth_test_account.as_deref().map(|t| normalize_phone(t));
    let test_code = config.auth_test_code.as_deref();

    match (test_account, test_code) {
        (Some(ref account), Some(expected_code)) if account == phone && code == expected_code => {
            true
        }
        _ => false,
    }
}

async fn verify_code(db: &PgPool, phone: &str, code: &str) -> Result<()> {
    let row: Option<(String, i32)> = sqlx::query_as(
        "SELECT code, attempts FROM sms_code WHERE phone = $1 AND expires_at > NOW()",
    )
    .bind(phone)
    .fetch_optional(db)
    .await?;

    let (expected_code, attempts) = row.ok_or(AppError::Unauthorized)?;

    if attempts >= 3 {
        warn!("too many attempts for {phone}");
        return Err(AppError::Unauthorized);
    }

    sqlx::query("UPDATE sms_code SET attempts = attempts + 1 WHERE phone = $1")
        .bind(phone)
        .execute(db)
        .await?;

    if expected_code != code {
        return Err(AppError::Unauthorized);
    }

    sqlx::query("DELETE FROM sms_code WHERE phone = $1")
        .bind(phone)
        .execute(db)
        .await?;

    Ok(())
}

fn generate_token(user: &AuthUser, config: &Config) -> Result<String> {
    let now = Utc::now().timestamp();
    let claims = AuthUser {
        id: user.id,
        is_admin: user.is_admin,
        is_signed_up: user.is_signed_up,
        iat: now,
        exp: now + 30 * 24 * 3600,
    };

    encode(
        &Header::default(),
        &claims,
        &config.auth_keys.encoding,
    )
    .map_err(AppError::unexpected)
}
