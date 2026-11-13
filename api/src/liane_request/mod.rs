use axum::Router;
use axum::routing::get;

use crate::liane_request::handler::{create, delete, get_one, list, update};

mod handler;
pub mod model;
mod service;

pub fn liane_request_router() -> Router {
    Router::new()
        .route("/", get(list).post(create))
        .route("/{id}", get(get_one).put(update).delete(delete))
}
