use axum::Router;
use axum::routing::get;

use crate::user::handler::{delete_me, get_me, get_user, update_me};

mod deletion;
mod handler;
pub mod identity;
pub mod model;
mod service;

/// `DELETE /me` supprime le compte de l'utilisateur (voir `deletion`).
pub fn user_router() -> Router {
    Router::new()
        .route("/me", get(get_me).put(update_me).delete(delete_me))
        .route("/{id}", get(get_user))
}
