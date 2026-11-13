use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::{Extension, RequestPartsExt};
use jsonwebtoken::{Validation, decode};

use crate::auth::model::AuthUser;
use crate::config::Config;
use crate::error::AppError;

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        let config = parts
            .extract::<Extension<Config>>()
            .await
            .map_err(|_| AppError::unexpected("Unable to extract Config"))?;

        try_extract_bearer(parts)
            .ok_or(AppError::Unauthorized)
            .and_then(|value| {
                decode::<AuthUser>(value, &config.auth_keys.decoding, &Validation::default())
                    .map_err(|_| AppError::Unauthorized)
            })
            .map(|token| token.claims)
    }
}

#[derive(Debug)]
pub struct OptionalUser(pub Option<AuthUser>);

impl<S> FromRequestParts<S> for OptionalUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        let config = parts
            .extract::<Extension<Config>>()
            .await
            .map_err(|_| AppError::unexpected("Unable to extract Config"))?;

        let user = try_extract_bearer(parts).and_then(|value| {
            decode::<AuthUser>(value, &config.auth_keys.decoding, &Validation::default())
                .ok()
                .map(|token| token.claims)
        });

        Ok(OptionalUser(user))
    }
}

#[derive(Debug)]
pub struct AdminUser;

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

        Ok(AdminUser)
    }
}

fn try_extract_bearer(parts: &mut Parts) -> Option<&str> {
    parts
        .headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
}
