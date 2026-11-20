//! Envoi du code de connexion par SMS. Le fournisseur réel (Brevo) est externe : en développement
//! on choisit explicitement `LogSmsSender`, qui écrit le code dans le journal.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tracing::warn;

use crate::config::SmsProvider;

const SEND_TIMEOUT: Duration = Duration::from_secs(10);

pub type SmsFuture<'a> = Pin<Box<dyn Future<Output = Result<(), String>> + Send + 'a>>;

pub trait SmsSender: Send + Sync {
    /// `phone` est au format international (`+33612345678`).
    fn send_code<'a>(&'a self, phone: &'a str, code: &'a str) -> SmsFuture<'a>;
}

/// L'expéditeur de SMS choisi au démarrage (extension Axum).
#[derive(Clone)]
pub struct SmsGateway(pub Arc<dyn SmsSender>);

impl SmsGateway {
    pub fn new(provider: &SmsProvider) -> Self {
        match provider {
            SmsProvider::Log => Self(Arc::new(LogSmsSender)),
            SmsProvider::Brevo {
                api_key,
                api_url,
                sender,
            } => Self(Arc::new(BrevoSmsSender::new(api_url, api_key, sender))),
        }
    }
}

/// Développement uniquement : le code apparaît en clair dans le journal.
pub struct LogSmsSender;

impl SmsSender for LogSmsSender {
    fn send_code<'a>(&'a self, phone: &'a str, code: &'a str) -> SmsFuture<'a> {
        Box::pin(async move {
            warn!("SMS (not sent, SMS_PROVIDER=log) code for {phone}: {code}");
            Ok(())
        })
    }
}

/// API « SMS transactionnels » de Brevo.
pub struct BrevoSmsSender {
    client: reqwest::Client,
    api_url: String,
    api_key: String,
    sender: String,
}

/// Corps de la demande d'envoi d'un SMS transactionnel.
#[derive(Serialize)]
struct BrevoSms<'a> {
    sender: &'a str,
    recipient: &'a str,
    content: String,
    #[serde(rename = "type")]
    kind: BrevoSmsKind,
    tag: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
enum BrevoSmsKind {
    Transactional,
}

impl BrevoSmsSender {
    pub fn new(api_url: &str, api_key: &str, sender: &str) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_url: api_url.to_string(),
            api_key: api_key.to_string(),
            sender: sender.to_string(),
        }
    }
}

impl SmsSender for BrevoSmsSender {
    fn send_code<'a>(&'a self, phone: &'a str, code: &'a str) -> SmsFuture<'a> {
        Box::pin(async move {
            let response = self
                .client
                .post(&self.api_url)
                .timeout(SEND_TIMEOUT)
                .header("api-key", &self.api_key)
                .json(&BrevoSms {
                    sender: &self.sender,
                    recipient: phone.trim_start_matches('+'),
                    content: format!("Liane : votre code de connexion est {code}"),
                    kind: BrevoSmsKind::Transactional,
                    tag: "auth",
                })
                .send()
                .await
                .map_err(|err| format!("SMS provider unreachable: {}", err.without_url()))?;

            if response.status().is_success() {
                Ok(())
            } else {
                Err(format!("SMS provider answered {}", response.status()))
            }
        })
    }
}
