use axum::Router;
use axum::routing::{get, post};

use crate::trip::handler::{
    book, cancel, create, export, get_one, list_for_admin, list_mine, list_of_liane, record_gesture,
};

mod handler;
pub mod model;
mod proof;
mod rules;
pub mod service;

/// Routes montées sous `/api/liane`, réservées aux membres de la liane.
pub fn liane_trip_router() -> Router {
    Router::new().route("/{id}/trip", get(list_of_liane).post(create))
}

/// `/admin` (trajets avec leur preuve) et `/admin/export` (couples conducteur/passager au format du
/// registre de preuve de covoiturage, avec les numéros de téléphone) sont réservées aux administrateurs.
/// Les autres demandent un compte ; un trajet n'est visible que des membres de sa liane.
pub fn trip_router() -> Router {
    Router::new()
        .route("/mine", get(list_mine))
        .route("/admin", get(list_for_admin))
        .route("/admin/export", get(export))
        .route("/{id}", get(get_one).delete(cancel))
        .route("/{id}/passenger", post(book).delete(handler::unbook))
        .route("/{id}/gesture", post(record_gesture))
}
