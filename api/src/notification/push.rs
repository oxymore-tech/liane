//! Envoi d'une notification Web Push à un appareil. L'envoi réel passe par le service de push
//! du navigateur (externe) : il reste derrière ce trait. Par défaut, rien ne sort du serveur.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use serde::Serialize;
use sqlx::FromRow;
use tracing::info;
use uuid::Uuid;

use crate::config::PushProvider;
use crate::error::Result;
use crate::notification::web_push::WebPushSender;

#[derive(Debug, Clone, FromRow)]
pub struct PushSubscription {
    pub id: Uuid,
    pub user_id: Uuid,
    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
}

/// Contenu lu par le service worker (`web/src/app/sw.ts`).
/// `tag` regroupe les notifications d'un même sujet : la plus récente remplace la précédente.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PushNotification {
    pub title: String,
    pub body: String,
    pub url: String,
    pub tag: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PushOutcome {
    Sent,
    /// L'abonnement n'existe plus côté navigateur : il faut l'oublier.
    Gone,
    Failed(String),
}

pub type PushFuture<'a> = Pin<Box<dyn Future<Output = PushOutcome> + Send + 'a>>;

pub trait PushSender: Send + Sync {
    fn send<'a>(
        &'a self,
        subscription: &'a PushSubscription,
        notification: &'a PushNotification,
    ) -> PushFuture<'a>;
}

/// Écrit la notification dans le journal au lieu de l'envoyer.
pub struct LogPushSender;

impl PushSender for LogPushSender {
    fn send<'a>(
        &'a self,
        subscription: &'a PushSubscription,
        notification: &'a PushNotification,
    ) -> PushFuture<'a> {
        Box::pin(async move {
            info!(
                "Push (not sent) to user {} device {}: {} | {} | {}",
                subscription.user_id,
                subscription.id,
                notification.title,
                notification.body,
                notification.url
            );
            PushOutcome::Sent
        })
    }
}

/// L'expéditeur choisi par la configuration.
pub fn sender(provider: &PushProvider) -> Result<Arc<dyn PushSender>> {
    match provider {
        PushProvider::Log => Ok(Arc::new(LogPushSender)),
        PushProvider::WebPush {
            vapid_private_key,
            vapid_public_key,
            vapid_subject,
        } => Ok(Arc::new(WebPushSender::new(
            vapid_private_key,
            vapid_public_key,
            vapid_subject,
        )?)),
    }
}
