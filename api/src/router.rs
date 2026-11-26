use axum::routing::get;
use axum::{Extension, Router};
use sqlx::PgPool;

use crate::auth::auth_router;
use crate::auth::sms::SmsGateway;
use crate::config::Config;
use crate::health::health;
use crate::liane::liane_router;
use crate::liane_request::liane_request_router;
use crate::message::liane_message_router;
use crate::notification::{Notifier, push_router};
use crate::rallying_point::rallying_point_router;
use crate::trip::{liane_trip_router, trip_router};
use crate::user::user_router;
use crate::wallet::wallet_router;

/// L'API complète. À servir avec `into_make_service_with_connect_info::<SocketAddr>()` :
/// la limite de débit a besoin de l'adresse du client.
pub fn app(db: PgPool, config: Config, notifier: Notifier, sms: SmsGateway) -> Router {
    api_router()
        .layer(Extension(db))
        .layer(Extension(config))
        .layer(Extension(notifier))
        .layer(Extension(sms))
}

fn api_router() -> Router {
    Router::new()
        .route("/api/health", get(health))
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
        .nest("/api/wallet", wallet_router())
}
