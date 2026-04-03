use axum::Router;

use crate::auth::auth_router;
use crate::rallying_point::rallying_point_router;

pub fn api_router() -> Router {
    Router::new()
        .nest("/api/auth", auth_router())
        .nest("/api/rallying_point", rallying_point_router())
}
