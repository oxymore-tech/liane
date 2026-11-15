use std::env::var;

use axum::http::HeaderValue;
use jsonwebtoken::{DecodingKey, EncodingKey};

#[derive(Clone)]
pub struct Keys {
    pub encoding: EncodingKey,
    pub decoding: DecodingKey,
}

impl Keys {
    pub fn new(secret: &[u8]) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret),
            decoding: DecodingKey::from_secret(secret),
        }
    }
}

/// À VALIDER — barème du partage de frais indicatif, en centimes d'euro par kilomètre, pour la
/// voiture entière : il est divisé entre les occupants (conducteur compris). Valeur reprise de
/// l'ancienne application (0,30 €/km). Aucun paiement n'en découle.
pub const INDICATIVE_COST_SHARING_CENTS_PER_KM: i64 = 30;

const DEFAULT_PORT: u16 = 5000;
const DEFAULT_BREVO_SMS_URL: &str = "https://api.brevo.com/v3/transactionalSMS/sms";
const DEFAULT_SMS_SENDER: &str = "Liane";

/// Compte de démonstration : numéro et code fixes, créé administrateur à sa première connexion.
/// N'existe que si `AUTH_TEST_ACCOUNT_ENABLED=true`.
#[derive(Clone, Debug, PartialEq)]
pub struct TestAccount {
    pub phone: String,
    pub code: String,
}

/// Plafonds par heure glissante.
#[derive(Clone, Debug, PartialEq)]
pub struct AuthLimits {
    pub sms_per_phone: i64,
    pub sms_per_ip: i64,
    pub failed_logins_per_ip: i64,
}

impl Default for AuthLimits {
    fn default() -> Self {
        Self {
            sms_per_phone: 5,
            sms_per_ip: 30,
            failed_logins_per_ip: 30,
        }
    }
}

/// Ce dont les requêtes ont besoin (extension Axum).
#[derive(Clone)]
pub struct Config {
    pub auth_keys: Keys,
    /// Vide : pas de calcul d'itinéraire, les tracés sont des lignes droites entre les arrêts.
    pub osrm_url: String,
    pub test_account: Option<TestAccount>,
    pub auth_limits: AuthLimits,
    /// Nombre de mandataires de confiance devant l'API (traefik, serveur web). 0 : l'adresse du
    /// client est celle de la connexion ; n : la n-ième en partant de la fin de `X-Forwarded-For`.
    pub trusted_proxy_count: usize,
    /// Clé publique VAPID donnée aux navigateurs pour s'abonner aux notifications.
    /// Absente : les notifications ne sont pas proposées.
    pub vapid_public_key: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum SmsProvider {
    /// Développement : le code est écrit dans le journal, aucun SMS ne part.
    Log,
    Brevo {
        api_key: String,
        api_url: String,
        sender: String,
    },
}

#[derive(Clone, Debug, PartialEq)]
pub enum PushProvider {
    /// Les notifications sont écrites dans le journal, rien ne sort du serveur.
    Log,
    WebPush {
        vapid_private_key: String,
        vapid_subject: String,
    },
}

/// Toute la configuration, lue une fois au démarrage.
#[derive(Clone)]
pub struct Settings {
    pub config: Config,
    pub database_url: String,
    pub port: u16,
    pub cors_allowed_origins: Vec<HeaderValue>,
    pub sms: SmsProvider,
    pub push: PushProvider,
}

impl Settings {
    pub fn load() -> Result<Settings, String> {
        Self::from_lookup(|name| var(name).ok())
    }

    /// Une variable vide compte comme absente.
    pub fn from_lookup(lookup: impl Fn(&str) -> Option<String>) -> Result<Settings, String> {
        let get = |name: &str| lookup(name).filter(|value| !value.trim().is_empty());
        let required = |name: &str| get(name).ok_or_else(|| format!("{name} is required"));

        let sms = match get("SMS_PROVIDER").as_deref() {
            Some("log") => SmsProvider::Log,
            Some("brevo") => SmsProvider::Brevo {
                api_key: get("SMS_API_KEY")
                    .ok_or("SMS_API_KEY is required when SMS_PROVIDER=brevo")?,
                api_url: get("SMS_API_URL").unwrap_or_else(|| DEFAULT_BREVO_SMS_URL.to_string()),
                sender: get("SMS_SENDER").unwrap_or_else(|| DEFAULT_SMS_SENDER.to_string()),
            },
            Some(other) => return Err(format!("SMS_PROVIDER must be log or brevo, not {other}")),
            None => {
                return Err(
                    "SMS_PROVIDER is required: brevo, or log (development only, codes are written to the logs)"
                        .to_string(),
                );
            }
        };

        let vapid_public_key = get("VAPID_PUBLIC_KEY");
        let push = match get("PUSH_PROVIDER").as_deref() {
            None | Some("log") => PushProvider::Log,
            Some("webpush") => {
                if vapid_public_key.is_none() {
                    return Err("VAPID_PUBLIC_KEY is required when PUSH_PROVIDER=webpush".into());
                }
                PushProvider::WebPush {
                    vapid_private_key: get("VAPID_PRIVATE_KEY")
                        .ok_or("VAPID_PRIVATE_KEY is required when PUSH_PROVIDER=webpush")?,
                    vapid_subject: get("VAPID_SUBJECT")
                        .ok_or("VAPID_SUBJECT (mailto:… or https://…) is required when PUSH_PROVIDER=webpush")?,
                }
            }
            Some(other) => {
                return Err(format!(
                    "PUSH_PROVIDER must be log or webpush, not {other}"
                ));
            }
        };

        let test_account = if get("AUTH_TEST_ACCOUNT_ENABLED").as_deref() == Some("true") {
            Some(TestAccount {
                phone: required("AUTH_TEST_ACCOUNT")?,
                code: required("AUTH_TEST_CODE")?,
            })
        } else {
            None
        };

        let defaults = AuthLimits::default();
        let auth_limits = AuthLimits {
            sms_per_phone: number(&get, "AUTH_SMS_PER_PHONE_PER_HOUR", defaults.sms_per_phone)?,
            sms_per_ip: number(&get, "AUTH_SMS_PER_IP_PER_HOUR", defaults.sms_per_ip)?,
            failed_logins_per_ip: number(
                &get,
                "AUTH_FAILED_LOGINS_PER_IP_PER_HOUR",
                defaults.failed_logins_per_ip,
            )?,
        };

        let cors_allowed_origins = get("CORS_ALLOWED_ORIGINS")
            .unwrap_or_default()
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
            .map(|origin| {
                HeaderValue::from_str(origin)
                    .map_err(|_| format!("CORS_ALLOWED_ORIGINS: invalid origin {origin}"))
            })
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Settings {
            config: Config {
                auth_keys: Keys::new(required("JWT_SECRET")?.as_bytes()),
                osrm_url: get("OSRM_URL").unwrap_or_default(),
                test_account,
                auth_limits,
                trusted_proxy_count: number(&get, "TRUSTED_PROXY_COUNT", 0)?,
                vapid_public_key,
            },
            database_url: required("DATABASE_URL")?,
            port: number(&get, "PORT", DEFAULT_PORT)?,
            cors_allowed_origins,
            sms,
            push,
        })
    }
}

fn number<T: std::str::FromStr>(
    get: &impl Fn(&str) -> Option<String>,
    name: &str,
    default: T,
) -> Result<T, String> {
    match get(name) {
        Some(value) => value
            .trim()
            .parse()
            .map_err(|_| format!("{name} must be a number, not {value}")),
        None => Ok(default),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings(vars: &[(&str, &str)]) -> Result<Settings, String> {
        let mut all = vec![
            ("DATABASE_URL", "postgres://x"),
            ("JWT_SECRET", "secret"),
            ("SMS_PROVIDER", "log"),
        ];
        all.extend_from_slice(vars);
        Settings::from_lookup(|name| {
            all.iter()
                .rev()
                .find(|(key, _)| *key == name)
                .map(|(_, value)| value.to_string())
        })
    }

    fn error(vars: &[(&str, &str)]) -> String {
        settings(vars).err().expect("configuration refusée")
    }

    #[test]
    fn minimal_configuration_has_safe_defaults() {
        let settings = settings(&[]).unwrap();
        assert_eq!(settings.port, 5000);
        assert!(settings.cors_allowed_origins.is_empty());
        assert_eq!(settings.sms, SmsProvider::Log);
        assert_eq!(settings.push, PushProvider::Log);
        assert_eq!(settings.config.test_account, None);
        assert_eq!(settings.config.trusted_proxy_count, 0);
        assert_eq!(settings.config.auth_limits, AuthLimits::default());
    }

    #[test]
    fn sms_provider_must_be_chosen_explicitly() {
        assert!(error(&[("SMS_PROVIDER", "")]).contains("SMS_PROVIDER is required"));
        assert!(error(&[("SMS_PROVIDER", "twilio")]).contains("log or brevo"));
    }

    #[test]
    fn sms_api_key_is_only_required_for_the_real_provider() {
        assert!(error(&[("SMS_PROVIDER", "brevo")]).contains("SMS_API_KEY"));
        let settings = settings(&[("SMS_PROVIDER", "brevo"), ("SMS_API_KEY", "k")]).unwrap();
        assert_eq!(
            settings.sms,
            SmsProvider::Brevo {
                api_key: "k".into(),
                api_url: DEFAULT_BREVO_SMS_URL.into(),
                sender: "Liane".into()
            }
        );
    }

    #[test]
    fn test_account_needs_the_explicit_switch() {
        let account = [("AUTH_TEST_ACCOUNT", "+33600000000"), ("AUTH_TEST_CODE", "000000")];
        assert_eq!(settings(&account).unwrap().config.test_account, None);

        let mut enabled = account.to_vec();
        enabled.push(("AUTH_TEST_ACCOUNT_ENABLED", "true"));
        assert_eq!(
            settings(&enabled).unwrap().config.test_account,
            Some(TestAccount {
                phone: "+33600000000".into(),
                code: "000000".into()
            })
        );
        assert!(error(&[("AUTH_TEST_ACCOUNT_ENABLED", "true")]).contains("AUTH_TEST_ACCOUNT"));
    }

    #[test]
    fn web_push_needs_its_keys() {
        assert!(error(&[("PUSH_PROVIDER", "webpush")]).contains("VAPID_PUBLIC_KEY"));
        assert!(
            error(&[("PUSH_PROVIDER", "webpush"), ("VAPID_PUBLIC_KEY", "p")])
                .contains("VAPID_PRIVATE_KEY")
        );
    }

    #[test]
    fn origins_port_and_limits_are_read() {
        let settings = settings(&[
            ("CORS_ALLOWED_ORIGINS", "https://liane.app, http://localhost:3000"),
            ("PORT", "8080"),
            ("AUTH_SMS_PER_IP_PER_HOUR", "2"),
            ("TRUSTED_PROXY_COUNT", "1"),
        ])
        .unwrap();
        assert_eq!(settings.cors_allowed_origins.len(), 2);
        assert_eq!(settings.port, 8080);
        assert_eq!(settings.config.auth_limits.sms_per_ip, 2);
        assert_eq!(settings.config.trusted_proxy_count, 1);
        assert!(error(&[("PORT", "abc")]).contains("PORT must be a number"));
    }
}
