use axum::extract::Query;
use axum::{Extension, Json};
use sqlx::PgPool;

use crate::auth::extractor::ClientIp;
use crate::auth::model::{AuthRequest, AuthResponse, AuthUser};
use crate::auth::service;
use crate::auth::sms::SmsGateway;
use crate::config::Config;
use crate::error::Result;

#[derive(serde::Deserialize)]
pub struct SendCodeQuery {
    pub phone: String,
}

pub async fn send_code(
    ClientIp(ip): ClientIp,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
    Extension(sms): Extension<SmsGateway>,
    Query(q): Query<SendCodeQuery>,
) -> Result<()> {
    service::send_code(&db, &config, &sms, &q.phone, &ip).await
}

pub async fn login(
    ClientIp(ip): ClientIp,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
    Json(req): Json<AuthRequest>,
) -> Result<Json<AuthResponse>> {
    let response = service::login(&db, &config, &req, &ip).await?;
    Ok(Json(response))
}

pub async fn logout(user: AuthUser, Extension(db): Extension<PgPool>) -> Result<()> {
    service::logout(&db, &user.session_id).await
}
