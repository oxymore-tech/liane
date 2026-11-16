use rand::Rng;
use sqlx::PgPool;
use tracing::warn;
use uuid::Uuid;

use crate::auth::model::{AuthRequest, AuthResponse, AuthToken, LoggedUser};
use crate::auth::rate_limit::{self, AuthEvent, Key};
use crate::auth::session;
use crate::auth::sms::SmsGateway;
use crate::config::Config;
use crate::error::{AppError, Result};

const MAX_CODE_ATTEMPTS: i32 = 3;

/// Numéro au format international (`+33612345678`), ou rien s'il n'en a pas la forme.
pub fn normalize_phone(phone: &str) -> Option<String> {
    let digits: String = phone.chars().filter(char::is_ascii_digit).collect();
    let international = if phone.trim_start().starts_with('+') {
        digits
    } else if let Some(national) = digits.strip_prefix('0') {
        format!("33{national}")
    } else {
        digits
    };
    (8..=15)
        .contains(&international.len())
        .then(|| format!("+{international}"))
}

/// Le code est valable deux minutes, pour trois essais, et ne sert qu'une fois.
pub async fn send_code(
    db: &PgPool,
    config: &Config,
    sms: &SmsGateway,
    phone: &str,
    ip: &str,
) -> Result<()> {
    let phone = normalize_phone(phone).ok_or(AppError::BadRequest)?;

    if is_test_account(config, &phone) {
        return Ok(());
    }

    let limits = &config.auth_limits;
    rate_limit::check(db, AuthEvent::SmsSent, Key::Phone(&phone), limits.sms_per_phone).await?;
    rate_limit::check(db, AuthEvent::SmsSent, Key::Ip(ip), limits.sms_per_ip).await?;
    rate_limit::record(db, AuthEvent::SmsSent, &phone, ip).await?;

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

    sms.0
        .send_code(&phone, &code)
        .await
        .map_err(AppError::Unexpected)
}

pub async fn login(
    db: &PgPool,
    config: &Config,
    req: &AuthRequest,
    ip: &str,
) -> Result<AuthResponse> {
    let phone = normalize_phone(&req.phone).ok_or(AppError::Unauthorized)?;
    let is_test = is_test_login(config, &phone, &req.code);

    if !is_test {
        let limit = config.auth_limits.failed_logins_per_ip;
        rate_limit::check(db, AuthEvent::LoginFailed, Key::Ip(ip), limit).await?;
        if !consume_code(db, &phone, &req.code).await? {
            rate_limit::record(db, AuthEvent::LoginFailed, &phone, ip).await?;
            return Err(AppError::Unauthorized);
        }
    }

    let (id, is_admin) = find_or_create_user(db, &phone, is_test).await?;
    let access_token = session::open(db, &config.auth_keys, &id).await?;

    Ok(AuthResponse {
        user: LoggedUser { id, is_admin },
        token: AuthToken { access_token },
    })
}

pub async fn logout(db: &PgPool, session_id: &Uuid) -> Result<()> {
    session::close(db, session_id).await
}

fn is_test_account(config: &Config, phone: &str) -> bool {
    config
        .test_account
        .as_ref()
        .is_some_and(|account| normalize_phone(&account.phone).as_deref() == Some(phone))
}

fn is_test_login(config: &Config, phone: &str, code: &str) -> bool {
    is_test_account(config, phone)
        && config
            .test_account
            .as_ref()
            .is_some_and(|account| account.code == code)
}

/// Compte l'essai et dit si le code est le bon. Un bon code est supprimé : il ne sert qu'une fois.
/// L'essai est compté dans la même requête que la lecture du code : des essais simultanés ne
/// peuvent pas dépasser le plafond.
async fn consume_code(db: &PgPool, phone: &str, code: &str) -> Result<bool> {
    let expected: Option<String> = sqlx::query_scalar(
        r#"
            UPDATE sms_code
            SET attempts = attempts + 1
            WHERE phone = $1 AND expires_at > NOW() AND attempts < $2
            RETURNING code
        "#,
    )
    .bind(phone)
    .bind(MAX_CODE_ATTEMPTS)
    .fetch_optional(db)
    .await?;

    let Some(expected) = expected else {
        warn!("login refused for {phone}: no valid code or too many attempts");
        return Ok(false);
    };
    if expected != code {
        return Ok(false);
    }

    let consumed = sqlx::query("DELETE FROM sms_code WHERE phone = $1 AND code = $2")
        .bind(phone)
        .bind(code)
        .execute(db)
        .await?;
    Ok(consumed.rows_affected() == 1)
}

/// Le compte de démonstration est créé administrateur.
async fn find_or_create_user(db: &PgPool, phone: &str, is_test: bool) -> Result<(Uuid, bool)> {
    let existing: Option<(Uuid, bool)> =
        sqlx::query_as(r#"SELECT id, is_admin FROM "user" WHERE phone = $1"#)
            .bind(phone)
            .fetch_optional(db)
            .await?;
    if let Some(user) = existing {
        return Ok(user);
    }

    let id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO "user" (phone, is_admin) VALUES ($1, $2) RETURNING id"#,
    )
    .bind(phone)
    .bind(is_test)
    .fetch_one(db)
    .await?;
    Ok((id, is_test))
}

#[cfg(test)]
mod tests {
    use super::normalize_phone;

    #[test]
    fn french_numbers_become_international() {
        assert_eq!(normalize_phone("06 12 34 56 78").as_deref(), Some("+33612345678"));
        assert_eq!(normalize_phone("+33 6 12 34 56 78").as_deref(), Some("+33612345678"));
        assert_eq!(normalize_phone("33612345678").as_deref(), Some("+33612345678"));
    }

    #[test]
    fn what_is_not_a_phone_number_is_refused() {
        assert_eq!(normalize_phone(""), None);
        assert_eq!(normalize_phone("abc"), None);
        assert_eq!(normalize_phone("0612"), None);
        assert_eq!(normalize_phone("+3361234567890123456"), None);
    }
}
