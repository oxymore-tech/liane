use std::sync::Arc;

use axum::Router;
use axum::routing::{get, post};
use sqlx::PgPool;
use tokio::sync::broadcast;
use tracing::warn;
use uuid::Uuid;

use crate::message::model::Message;
use crate::notification::handler::{config, subscribe, unsubscribe};
use crate::notification::push::{PushNotification, PushOutcome, PushSender};

mod handler;
pub mod push;
mod subscription;
pub mod web_push;

const LIVE_EVENT_BUFFER: usize = 256;

/// `GET /config` est publique (clé publique VAPID) ; l'abonnement demande un compte.
pub fn push_router() -> Router {
    Router::new()
        .route("/config", get(config))
        .route("/subscription", post(subscribe).delete(unsubscribe))
}

/// Ce qui part vers les membres quand il se passe quelque chose : le fil en direct des lianes
/// (pour les écrans ouverts) et les notifications push (pour les appareils abonnés).
#[derive(Clone)]
pub struct Notifier {
    live: broadcast::Sender<Message>,
    push: Arc<dyn PushSender>,
}

impl Notifier {
    pub fn new(push: Arc<dyn PushSender>) -> Self {
        let (live, _) = broadcast::channel(LIVE_EVENT_BUFFER);
        Self { live, push }
    }

    pub fn follow_messages(&self) -> broadcast::Receiver<Message> {
        self.live.subscribe()
    }

    /// Sans écran ouvert, personne n'écoute : ce n'est pas une erreur.
    pub fn publish_message(&self, message: &Message) {
        let _ = self.live.send(message.clone());
    }

    /// Envoie en tâche de fond : la requête en cours n'attend pas le service de push.
    pub fn push(&self, db: &PgPool, user_ids: Vec<Uuid>, notification: PushNotification) {
        if user_ids.is_empty() {
            return;
        }
        let db = db.clone();
        let sender = self.push.clone();
        tokio::spawn(async move {
            let subscriptions = match subscription::find_for_users(&db, &user_ids).await {
                Ok(subscriptions) => subscriptions,
                Err(err) => {
                    warn!("Unable to load push subscriptions: {err:?}");
                    return;
                }
            };
            for subscription in subscriptions {
                match sender.send(&subscription, &notification).await {
                    PushOutcome::Sent => {}
                    PushOutcome::Gone => {
                        if let Err(err) = subscription::delete_by_id(&db, &subscription.id).await {
                            warn!("Unable to forget a gone push subscription: {err:?}");
                        }
                    }
                    PushOutcome::Failed(reason) => {
                        warn!("Push to device {} failed: {reason}", subscription.id);
                    }
                }
            }
        });
    }
}
