use sqlx::PgPool;

use crate::error::{AppError, Result};

#[derive(Debug, Clone, Copy)]
pub enum AuthEvent {
    SmsSent,
    LoginFailed,
}

impl AuthEvent {
    fn name(self) -> &'static str {
        match self {
            AuthEvent::SmsSent => "SmsSent",
            AuthEvent::LoginFailed => "LoginFailed",
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum Key<'a> {
    Phone(&'a str),
    Ip(&'a str),
}

/// Refuse (429) si `limit` événements de ce type ont déjà eu lieu dans l'heure pour cette clé.
pub async fn check(db: &PgPool, event: AuthEvent, key: Key<'_>, limit: i64) -> Result<()> {
    let (column, value) = match key {
        Key::Phone(phone) => ("phone", phone),
        Key::Ip(ip) => ("ip", ip),
    };
    let count: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM auth_event WHERE kind = $1 AND {column} = $2 AND created_at > NOW() - INTERVAL '1 hour'"
    ))
    .bind(event.name())
    .bind(value)
    .fetch_one(db)
    .await?;

    if count >= limit {
        Err(AppError::TooManyRequests)
    } else {
        Ok(())
    }
}

pub async fn record(db: &PgPool, event: AuthEvent, phone: &str, ip: &str) -> Result<()> {
    sqlx::query("DELETE FROM auth_event WHERE created_at < NOW() - INTERVAL '1 day'")
        .execute(db)
        .await?;
    sqlx::query("INSERT INTO auth_event (kind, phone, ip) VALUES ($1, $2, $3)")
        .bind(event.name())
        .bind(phone)
        .bind(ip)
        .execute(db)
        .await?;
    Ok(())
}
