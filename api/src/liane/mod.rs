use axum::Router;
use axum::routing::{delete, get, post};

use crate::liane::handler::{accept, create, find_matches, get_one, join, list, remove_member};

mod handler;
mod matching;
pub mod model;
mod service;

pub fn liane_router() -> Router {
    Router::new()
        .route("/", get(list).post(create))
        .route("/match/{liane_request_id}", get(find_matches))
        .route("/{id}", get(get_one))
        .route("/{id}/join", post(join))
        .route("/{id}/member/{member_id}", delete(remove_member))
        .route("/{id}/member/{member_id}/accept", post(accept))
}
