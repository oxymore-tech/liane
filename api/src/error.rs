use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use sqlx::migrate::MigrateError;
use std::cmp::Ordering;
use std::env::VarError;
use std::fmt::Debug;
use std::future::Future;
use tracing::error;

pub async fn handle_error<T: Future<Output = Result<()>>>(run: fn() -> T) {
    if let Err(err) = run().await {
        error!("{:?}", err);
        std::process::exit(1);
    }
}

#[derive(Clone, Debug)]
pub enum AppError {
    Unauthorized,
    Forbidden,
    NotFound,
    BadRequest,
    Conflict(String),
    Unexpected(String),
}

impl AppError {
    pub fn unexpected<E: Debug>(err: E) -> Self {
        Self::Unexpected(format!("{:?}", err))
    }
    pub fn conflict<E: Debug>(err: E) -> Self {
        Self::Conflict(format!("{:?}", err))
    }
}

pub type Result<T> = anyhow::Result<T, AppError>;

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status_code, body) = match self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "Forbidden".to_string()),
            AppError::NotFound => (StatusCode::NOT_FOUND, "Not Found".to_string()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
            AppError::Unexpected(err) => {
                error!("{}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal Server Error".to_string(),
                )
            }
            AppError::BadRequest => (StatusCode::BAD_REQUEST, "Bad Request".to_string()),
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
        match err.as_database_error() {
            Some(db_err) => {
                if let Some(code) = db_err.code()
                    && "23505".cmp(&code) == Ordering::Equal
                {
                    Self::conflict(db_err)
                } else {
                    Self::unexpected(err)
                }
            }
            _ => Self::unexpected(err),
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

impl From<dotenvy::Error> for AppError {
    fn from(err: dotenvy::Error) -> Self {
        Self::unexpected(err)
    }
}

impl From<VarError> for AppError {
    fn from(err: VarError) -> Self {
        Self::unexpected(err)
    }
}
