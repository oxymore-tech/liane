//! Envoi réel d'une notification Web Push : contenu chiffré pour l'appareil (RFC 8291, `aes128gcm`)
//! et requête signée par la clé VAPID du serveur (RFC 8292). Le chiffrement et la signature sont
//! ceux de la bibliothèque `web-push` ; la requête HTTP part avec `reqwest`, comme le reste de l'API.

use std::time::Duration;

use web_push::{
    ContentEncoding, PartialVapidSignatureBuilder, SubscriptionInfo, Urgency,
    VapidSignatureBuilder, WebPushMessage, WebPushMessageBuilder,
};

use crate::error::{AppError, Result};
use crate::notification::push::{
    PushFuture, PushNotification, PushOutcome, PushSender, PushSubscription,
};

const SEND_TIMEOUT: Duration = Duration::from_secs(10);
/// Durée pendant laquelle le service de push garde la notification pour un appareil éteint.
const TIME_TO_LIVE_SECONDS: u32 = 12 * 3600;

pub struct WebPushSender {
    client: reqwest::Client,
    vapid: PartialVapidSignatureBuilder,
    subject: String,
}

impl WebPushSender {
    /// `private_key` : clé privée VAPID, 32 octets en base64 « URL-safe ». `public_key` : la clé publique
    /// donnée aux navigateurs ; elle doit être celle de la clé privée, sinon tous les envois seraient refusés.
    /// `subject` : contact de l'exploitant (`mailto:…` ou `https://…`), exigé par les services de push.
    pub fn new(private_key: &str, public_key: &str, subject: &str) -> Result<Self> {
        let vapid = VapidSignatureBuilder::from_base64_no_sub(private_key.trim_end_matches('='))
            .map_err(|err| AppError::Unexpected(format!("VAPID_PRIVATE_KEY is invalid: {err}")))?;

        if base64_url(&vapid.get_public_key()) != public_key.trim_end_matches('=') {
            return Err(AppError::Unexpected(
                "VAPID_PUBLIC_KEY is not the public key of VAPID_PRIVATE_KEY".to_string(),
            ));
        }
        if !subject.starts_with("mailto:") && !subject.starts_with("https://") {
            return Err(AppError::Unexpected(
                "VAPID_SUBJECT must start with mailto: or https://".to_string(),
            ));
        }

        Ok(Self {
            client: reqwest::Client::new(),
            vapid,
            subject: subject.to_string(),
        })
    }

    fn message(
        &self,
        subscription: &PushSubscription,
        content: &[u8],
    ) -> std::result::Result<WebPushMessage, String> {
        let info = SubscriptionInfo::new(
            subscription.endpoint.as_str(),
            subscription.p256dh.as_str(),
            subscription.auth.as_str(),
        );
        let audience = origin(&subscription.endpoint).ok_or("invalid endpoint")?;

        let mut signature = self.vapid.clone().add_sub_info(&info);
        signature.add_claim("sub", self.subject.as_str());
        signature.add_claim("aud", audience.as_str());
        let signature = signature.build().map_err(|err| err.to_string())?;

        let mut message = WebPushMessageBuilder::new(&info);
        message.set_payload(ContentEncoding::Aes128Gcm, content);
        message.set_vapid_signature(signature);
        message.set_ttl(TIME_TO_LIVE_SECONDS);
        message.set_urgency(Urgency::Normal);
        message.build().map_err(|err| err.to_string())
    }

    async fn deliver(
        &self,
        subscription: &PushSubscription,
        notification: &PushNotification,
    ) -> PushOutcome {
        let content = match serde_json::to_vec(notification) {
            Ok(content) => content,
            Err(err) => return PushOutcome::Failed(err.to_string()),
        };
        let message = match self.message(subscription, &content) {
            Ok(message) => message,
            Err(reason) => return PushOutcome::Failed(reason),
        };
        let Some(payload) = message.payload else {
            return PushOutcome::Failed("empty payload".to_string());
        };

        let mut request = self
            .client
            .post(&subscription.endpoint)
            .timeout(SEND_TIMEOUT)
            .header("TTL", message.ttl.to_string())
            .header("Content-Encoding", payload.content_encoding.to_str())
            .header("Content-Type", "application/octet-stream");
        if let Some(urgency) = message.urgency {
            request = request.header("Urgency", urgency.to_string());
        }
        for (name, value) in payload.crypto_headers {
            request = request.header(name, value);
        }

        match request.body(payload.content).send().await {
            Ok(response) if response.status().is_success() => PushOutcome::Sent,
            Ok(response) if matches!(response.status().as_u16(), 404 | 410) => PushOutcome::Gone,
            Ok(response) => PushOutcome::Failed(format!("push service answered {}", response.status())),
            Err(err) => PushOutcome::Failed(format!("push service unreachable: {}", err.without_url())),
        }
    }
}

impl PushSender for WebPushSender {
    fn send<'a>(
        &'a self,
        subscription: &'a PushSubscription,
        notification: &'a PushNotification,
    ) -> PushFuture<'a> {
        Box::pin(self.deliver(subscription, notification))
    }
}

/// `https://hôte[:port]` : l'audience du jeton VAPID est l'origine du service de push.
fn origin(endpoint: &str) -> Option<String> {
    let url = reqwest::Url::parse(endpoint).ok()?;
    let host = url.host_str()?;
    Some(match url.port() {
        Some(port) => format!("{}://{host}:{port}", url.scheme()),
        None => format!("{}://{host}", url.scheme()),
    })
}

fn base64_url(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut encoded = String::new();
    for chunk in bytes.chunks(3) {
        let block = chunk
            .iter()
            .enumerate()
            .fold(0u32, |block, (index, byte)| block | (*byte as u32) << (16 - 8 * index));
        for position in 0..=chunk.len() {
            encoded.push(ALPHABET[(block >> (18 - 6 * position) & 63) as usize] as char);
        }
    }
    encoded
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_url_has_no_padding() {
        assert_eq!(base64_url(b""), "");
        assert_eq!(base64_url(b"f"), "Zg");
        assert_eq!(base64_url(b"fo"), "Zm8");
        assert_eq!(base64_url(b"foo"), "Zm9v");
        assert_eq!(base64_url(&[0xfb, 0xff, 0xfe]), "-__-");
    }

    #[test]
    fn audience_is_the_origin_of_the_push_service() {
        assert_eq!(
            origin("https://fcm.googleapis.com/fcm/send/abc").as_deref(),
            Some("https://fcm.googleapis.com")
        );
        assert_eq!(
            origin("http://127.0.0.1:8080/push/1").as_deref(),
            Some("http://127.0.0.1:8080")
        );
        assert_eq!(origin("pas une adresse"), None);
    }
}
