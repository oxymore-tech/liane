use axum::Router;
use axum::routing::get;

use crate::user::handler::{get_me, get_user, update_me};

mod handler;
pub mod model;
mod service;

pub fn user_router() -> Router {
    Router::new()
        .route("/me", get(get_me).put(update_me))
        .route("/{id}", get(get_user))
}
