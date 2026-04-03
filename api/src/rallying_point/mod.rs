use axum::Router;
use axum::routing::{get, post};

use crate::rallying_point::handler::{bbox, generate_points, search, snap};

mod generate;
mod handler;
pub mod model;
mod service;

pub fn rallying_point_router() -> Router {
    Router::new()
        .route("/", get(search))
        .route("/snap", get(snap))
        .route("/bbox", get(bbox))
        .route("/generate", post(generate_points))
}
