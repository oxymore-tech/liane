use std::convert::Infallible;
use std::time::Duration;

use axum::extract::{Path, Query};
use axum::http::HeaderName;
use axum::http::header::CACHE_CONTROL;
use axum::response::IntoResponse;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::{Extension, Json};
use futures_util::stream::unfold;
use sqlx::PgPool;
use tokio::sync::broadcast::error::RecvError;
use uuid::Uuid;

use crate::auth::model::AuthUser;
use crate::error::Result;
use crate::liane;
use crate::message::model::{Message, MessageInput, MessagePage, MessageQuery};
use crate::message::service;
use crate::notification::Notifier;

const KEEP_ALIVE: Duration = Duration::from_secs(20);
/// Sans cela, un intermédiaire qui compresse ou met en tampon (le serveur Next, nginx) retient
/// les messages au lieu de les faire suivre un par un.
const UNBUFFERED: [(HeaderName, &str); 2] = [
    (CACHE_CONTROL, "no-cache, no-transform"),
    (HeaderName::from_static("x-accel-buffering"), "no"),
];

pub async fn list(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(liane_id): Path<Uuid>,
    Query(query): Query<MessageQuery>,
) -> Result<Json<MessagePage>> {
    let page = service::list(&db, &liane_id, &auth.id, &query).await?;
    Ok(Json(page))
}

pub async fn send(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(liane_id): Path<Uuid>,
    Json(input): Json<MessageInput>,
) -> Result<Json<Message>> {
    let message = service::post_text(&db, &notifier, &liane_id, &auth.id, &input.text).await?;
    Ok(Json(message))
}

pub async fn mark_read(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(liane_id): Path<Uuid>,
) -> Result<()> {
    service::mark_read(&db, &liane_id, &auth.id).await
}

/// Fil en direct d'une liane (Server-Sent Events). Chaque nouveau message arrive en événement
/// `message` ; `resync` signale que des messages ont pu être manqués et qu'il faut relire le fil.
/// L'appartenance à la liane est revérifiée à chaque message : un membre exclu ne reçoit plus rien.
pub async fn stream(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(liane_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    let user_id = auth.id;
    service::ensure_member(&db, &liane_id, &user_id).await?;

    let live = unfold(notifier.follow_messages(), move |mut receiver| {
        let db = db.clone();
        async move {
            loop {
                let event = match receiver.recv().await {
                    Ok(message) if message.liane_id == liane_id => {
                        let is_member = liane::is_member(&db, &liane_id, &user_id).await;
                        if !is_member.unwrap_or(false) {
                            return None;
                        }
                        Event::default().event("message").json_data(&message).ok()?
                    }
                    Ok(_) => continue,
                    Err(RecvError::Lagged(_)) => Event::default().event("resync").data("{}"),
                    Err(RecvError::Closed) => return None,
                };
                return Some((Ok::<_, Infallible>(event), receiver));
            }
        }
    });

    let live: Sse<_> = Sse::new(live).keep_alive(KeepAlive::new().interval(KEEP_ALIVE));
    Ok((UNBUFFERED, live))
}
