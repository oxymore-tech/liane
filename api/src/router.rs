use axum::Router;

use crate::auth::auth_router;
use crate::liane::liane_router;
use crate::liane_request::liane_request_router;
use crate::rallying_point::rallying_point_router;
use crate::user::user_router;

pub fn api_router() -> Router {
    Router::new()
        .nest("/api/auth", auth_router())
        .nest("/api/liane", liane_router())
        .nest("/api/liane_request", liane_request_router())
        .nest("/api/rallying_point", rallying_point_router())
        .nest("/api/user", user_router())
}
