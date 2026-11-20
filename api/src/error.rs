use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use sqlx::migrate::MigrateError;
use std::env::VarError;
use std::fmt::Debug;
use tracing::{error, warn};

const UNIQUE_VIOLATION: &str = "23505";

#[derive(Clone, Debug)]
pub enum AppError {
    Unauthorized,
    Forbidden,
    NotFound,
    BadRequest,
    /// Comme `BadRequest`, avec un mot-clé dans la réponse qui dit ce qui est refusé.
    Invalid(String),
    TooManyRequests,
    /// Le texte part dans la réponse : un mot-clé métier, jamais un message de la base.
    Conflict(String),
    /// Le détail reste dans le journal ; la réponse dit seulement « Internal Server Error ».
    Unexpected(String),
}

impl AppError {
    pub fn unexpected<E: Debug>(err: E) -> Self {
        Self::Unexpected(format!("{:?}", err))
    }
}

pub type Result<T> = anyhow::Result<T, AppError>;

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status_code, body) = match self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "Forbidden".to_string()),
            AppError::NotFound => (StatusCode::NOT_FOUND, "Not Found".to_string()),
            AppError::TooManyRequests => (
                StatusCode::TOO_MANY_REQUESTS,
                "Too Many Requests".to_string(),
            ),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
            AppError::Unexpected(err) => {
                error!("{}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal Server Error".to_string(),
                )
            }
            AppError::BadRequest => (StatusCode::BAD_REQUEST, "Bad Request".to_string()),
            AppError::Invalid(msg) => (StatusCode::BAD_REQUEST, msg),
        };

        (status_code, body).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        Self::unexpected(err)
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        Self::unexpected(err)
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        let is_unique_violation = err
            .as_database_error()
            .and_then(|db_err| db_err.code())
            .is_some_and(|code| code == UNIQUE_VIOLATION);
        if is_unique_violation {
            warn!("unique violation: {err}");
            Self::Conflict("AlreadyExists".to_string())
        } else {
            Self::unexpected(err)
        }
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        Self::unexpected(err)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        Self::unexpected(err)
    }
}

impl From<MigrateError> for AppError {
    fn from(err: MigrateError) -> Self {
        Self::unexpected(err)
    }
}

impl From<VarError> for AppError {
    fn from(err: VarError) -> Self {
        Self::unexpected(err)
    }
}
