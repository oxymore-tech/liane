use axum::Router;
use axum::routing::{get, post};

use crate::rallying_point::handler::{
    admin_search, bbox, create, generate_points, get_one, search, snap, update,
};

pub mod generate;
mod handler;
pub mod model;
pub mod service;

/// Publiques : `GET /`, `GET /snap`, `GET /bbox` (points actifs seulement). Réservées aux administrateurs :
/// `POST /` (créer un point), `GET /admin` (recherche, points désactivés compris), `GET` et `PUT /{id}`,
/// `POST /generate`.
pub fn rallying_point_router() -> Router {
    Router::new()
        .route("/", get(search).post(create))
        .route("/admin", get(admin_search))
        .route("/snap", get(snap))
        .route("/bbox", get(bbox))
        .route("/generate", post(generate_points))
        .route("/{id}", get(get_one).put(update))
}
