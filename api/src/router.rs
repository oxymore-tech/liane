use axum::Router;

use crate::auth::auth_router;
use crate::liane::liane_router;
use crate::liane_request::liane_request_router;
use crate::message::liane_message_router;
use crate::notification::push_router;
use crate::rallying_point::rallying_point_router;
use crate::trip::{liane_trip_router, trip_router};
use crate::user::user_router;

/// Attend en extensions la base (`PgPool`), la configuration (`Config`) et le `Notifier`.
pub fn api_router() -> Router {
    Router::new()
        .nest("/api/auth", auth_router())
        .nest(
            "/api/liane",
            liane_router()
                .merge(liane_message_router())
                .merge(liane_trip_router()),
        )
        .nest("/api/liane_request", liane_request_router())
        .nest("/api/push", push_router())
        .nest("/api/rallying_point", rallying_point_router())
        .nest("/api/trip", trip_router())
        .nest("/api/user", user_router())
}
