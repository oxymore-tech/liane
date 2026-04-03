use axum::Router;

use crate::rallying_point::rallying_point_router;

pub fn api_router() -> Router {
    Router::new()
        .nest("/api/rallying_point", rallying_point_router())
}
