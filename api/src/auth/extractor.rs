use std::net::SocketAddr;

use axum::extract::{ConnectInfo, FromRequestParts};
use axum::http::request::Parts;
use sqlx::PgPool;

use crate::auth::model::AuthUser;
use crate::auth::session;
use crate::config::Config;
use crate::error::AppError;

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        find_user(parts).await?.ok_or(AppError::Unauthorized)
    }
}

/// Un jeton absent, invalide ou révoqué donne un visiteur anonyme.
#[derive(Debug)]
pub struct OptionalUser(pub Option<AuthUser>);

impl<S> FromRequestParts<S> for OptionalUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        Ok(OptionalUser(find_user(parts).await?))
    }
}

#[derive(Debug)]
pub struct AdminUser(pub AuthUser);

impl<S> FromRequestParts<S> for AdminUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;

        if !user.is_admin {
            return Err(AppError::Forbidden);
        }

        Ok(AdminUser(user))
    }
}

/// Adresse du client, pour limiter le débit. Voir `Config::trusted_proxy_count`.
#[derive(Debug)]
pub struct ClientIp(pub String);

impl<S> FromRequestParts<S> for ClientIp
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        let config = extension::<Config>(parts)?;
        let forwarded_for = parts
            .headers
            .get("X-Forwarded-For")
            .and_then(|value| value.to_str().ok());
        let peer = parts
            .extensions
            .get::<ConnectInfo<SocketAddr>>()
            .map(|ConnectInfo(address)| address.ip().to_string());

        Ok(ClientIp(client_ip(
            config.trusted_proxy_count,
            forwarded_for,
            peer,
        )))
    }
}

/// Chaque mandataire ajoute à la fin de `X-Forwarded-For` l'adresse de qui l'appelle : seules les
/// `trusted_proxy_count` dernières entrées sont dignes de confiance, le reste vient du client.
fn client_ip(
    trusted_proxy_count: usize,
    forwarded_for: Option<&str>,
    peer: Option<String>,
) -> String {
    let forwarded = forwarded_for.and_then(|header| {
        let hops: Vec<&str> = header.split(',').map(str::trim).collect();
        hops.len()
            .checked_sub(trusted_proxy_count)
            .filter(|_| trusted_proxy_count > 0)
            .map(|index| hops[index].to_string())
    });
    forwarded
        .or(peer)
        .unwrap_or_else(|| "unknown".to_string())
        .chars()
        .take(45)
        .collect()
}

async fn find_user(parts: &Parts) -> Result<Option<AuthUser>, AppError> {
    let Some(token) = bearer(parts) else {
        return Ok(None);
    };
    let config = extension::<Config>(parts)?;
    let db = extension::<PgPool>(parts)?;
    session::find_user(db, &config.auth_keys, token).await
}

fn extension<T: Send + Sync + 'static>(parts: &Parts) -> Result<&T, AppError> {
    parts
        .extensions
        .get::<T>()
        .ok_or_else(|| AppError::unexpected("Missing request extension"))
}

fn bearer(parts: &Parts) -> Option<&str> {
    parts
        .headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
}

#[cfg(test)]
mod tests {
    use super::client_ip;

    fn peer() -> Option<String> {
        Some("10.0.0.9".to_string())
    }

    #[test]
    fn without_trusted_proxy_the_header_is_ignored() {
        assert_eq!(client_ip(0, Some("1.2.3.4"), peer()), "10.0.0.9");
        assert_eq!(client_ip(0, None, None), "unknown");
    }

    #[test]
    fn the_client_is_the_entry_added_by_the_first_trusted_proxy() {
        assert_eq!(client_ip(1, Some("1.2.3.4"), peer()), "1.2.3.4");
        assert_eq!(client_ip(1, Some("6.6.6.6, 1.2.3.4"), peer()), "1.2.3.4");
        assert_eq!(
            client_ip(2, Some("6.6.6.6, 1.2.3.4, 10.0.0.2"), peer()),
            "1.2.3.4"
        );
    }

    #[test]
    fn a_shorter_chain_than_expected_falls_back_to_the_peer() {
        assert_eq!(client_ip(2, Some("1.2.3.4"), peer()), "10.0.0.9");
        assert_eq!(client_ip(1, None, peer()), "10.0.0.9");
    }
}
