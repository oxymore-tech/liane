use axum::Router;
use axum::routing::{get, post};

use crate::message::handler::{list, mark_read, send, stream};

mod handler;
pub mod model;
pub mod service;

/// Routes montées sous `/api/liane`, toutes réservées aux membres de la liane.
pub fn liane_message_router() -> Router {
    Router::new()
        .route("/{id}/message", get(list).post(send))
        .route("/{id}/message/read", post(mark_read))
        .route("/{id}/message/stream", get(stream))
}
