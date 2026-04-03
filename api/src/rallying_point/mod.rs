use axum::Router;
use axum::routing::get;

use crate::rallying_point::handler::{bbox, search, snap};

mod handler;
pub mod model;
mod service;

pub fn rallying_point_router() -> Router {
    Router::new()
        .route("/", get(search))
        .route("/snap", get(snap))
        .route("/bbox", get(bbox))
}
