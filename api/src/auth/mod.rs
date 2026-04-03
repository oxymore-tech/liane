use axum::Router;
use axum::routing::post;

use crate::auth::handler::{login, logout, send_code};

pub mod extractor;
mod handler;
pub mod model;
mod service;

pub fn auth_router() -> Router {
    Router::new()
        .route("/sms", post(send_code))
        .route("/login", post(login))
        .route("/logout", post(logout))
}
