//! Partage des frais entre un passager et son conducteur, au tarif kilométrique de Liane.
//! Le porte-monnaie est facultatif : l'argent ne concerne que deux occupants qui en ont chacun un.
//! Chaque trajet fait inscrit une ligne ; les lignes d'un mois sont dues à la fin de ce mois.
//! Aucun mouvement d'argent ici : seulement le relevé de ce qui est dû et de ce qui est à recevoir.

use axum::Router;
use axum::routing::get;

use crate::wallet::handler::{close, find, find_statement, open};

mod handler;
pub mod model;
pub mod service;

/// Chacun ne voit que son porte-monnaie et son relevé.
pub fn wallet_router() -> Router {
    Router::new()
        .route("/", get(find).put(open).delete(close))
        .route("/statement/{month}", get(find_statement))
}
