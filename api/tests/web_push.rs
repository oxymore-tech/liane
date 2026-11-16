//! Envoi réel Web Push, sans base ni service extérieur.
//!
//! Les premiers tests parlent à un faux service de push lancé dans le test : la signature VAPID est
//! vérifiée avec `jsonwebtoken` (la bibliothèque d'envoi signe avec `jwt-simple`), le contenu est relu
//! avec `ece`. Le dernier, `a_node_browser_decrypts_the_notification`, parle au récepteur indépendant
//! `tests/web_push/receiver.mjs` (Node) désigné par `TEST_PUSH_RECEIVER_URL` ; sans cette variable il ne fait rien.

use std::env::var;
use std::sync::{Arc, Mutex};

use api::notification::push::{PushNotification, PushOutcome, PushSender, PushSubscription};
use api::notification::web_push::WebPushSender;
use axum::body::Bytes;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use serde_json::{Value, json};
use tokio::net::TcpListener;
use uuid::Uuid;

/// Paire de clés jetable, générée pour ces tests avec les commandes openssl.
const VAPID_PRIVATE_KEY: &str = "1nrVxKC6Hp92mPd1-Hv1Bi1nLX7DQCCDMBamUPVOHI8";
const VAPID_PUBLIC_KEY: &str =
    "BCUlLUqcYMwRHMaAi-94JHK0D3Jhy9yojzkIR_-5mMwzUAyD_dnZNGMiBKNtN63y6hlLuHnpyE2hf8DdO3NsCgE";
const SUBJECT: &str = "mailto:exploitant@liane.invalid";

fn sender() -> WebPushSender {
    WebPushSender::new(VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, SUBJECT).expect("clés VAPID")
}

fn notification() -> PushNotification {
    PushNotification {
        title: "Florac – Mende".to_string(),
        body: "Camille D. a démarré le trajet de 7 h 30 — ça roule !".to_string(),
        url: "/trajet/0192".to_string(),
        tag: "trip-0192".to_string(),
    }
}

fn subscription(endpoint: &str, p256dh: &str, auth: &str) -> PushSubscription {
    PushSubscription {
        id: Uuid::now_v7(),
        user_id: Uuid::now_v7(),
        endpoint: endpoint.to_string(),
        p256dh: p256dh.to_string(),
        auth: auth.to_string(),
    }
}

fn base64_url(bytes: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

type Received = Arc<Mutex<Vec<(HeaderMap, Vec<u8>)>>>;

/// Un faux service de push local : garde ce qu'il reçoit et répond avec le statut demandé.
async fn fake_push_service(status: u16) -> (String, Received) {
    let received: Received = Arc::default();
    let store = received.clone();
    let handler = move |headers: HeaderMap, body: Bytes| async move {
        store.lock().unwrap().push((headers, body.to_vec()));
        StatusCode::from_u16(status).unwrap()
    };
    let app = axum::Router::new().route("/push/{id}", post(handler));
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("port local");
    let origin = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, app).await });
    (origin, received)
}

#[tokio::test]
async fn the_push_request_is_signed_and_encrypted_for_the_device() {
    let (origin, received) = fake_push_service(201).await;
    let (browser_keys, auth_secret) = ece::generate_keypair_and_auth_secret().unwrap();
    let browser = browser_keys.raw_components().unwrap();
    let device = subscription(
        &format!("{origin}/push/abc"),
        &base64_url(browser.public_key()),
        &base64_url(&auth_secret),
    );

    assert_eq!(
        sender().send(&device, &notification()).await,
        PushOutcome::Sent
    );

    let received = received.lock().unwrap();
    let (headers, body) = &received[0];
    let header = |name: &str| {
        headers
            .get(name)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("")
    };
    assert_eq!(header("content-encoding"), "aes128gcm");
    assert_eq!(header("ttl"), "43200");
    assert_eq!(header("urgency"), "normal");

    // RFC 8292 : « vapid t=<jeton ES256>, k=<clé publique> », signé par la clé privée du serveur.
    let authorization = header("authorization");
    let (token, key) = authorization
        .strip_prefix("vapid t=")
        .and_then(|rest| rest.split_once(", k="))
        .expect("en-tête VAPID");
    assert_eq!(key, VAPID_PUBLIC_KEY);
    let point = {
        use base64::Engine;
        base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(key)
            .unwrap()
    };
    let public_key =
        DecodingKey::from_ec_components(&base64_url(&point[1..33]), &base64_url(&point[33..]))
            .unwrap();
    let mut validation = Validation::new(Algorithm::ES256);
    validation.set_audience(&[origin.as_str()]);
    let claims = decode::<Value>(token, &public_key, &validation)
        .expect("signature et audience")
        .claims;
    assert_eq!(claims["sub"], SUBJECT);
    let lifetime = claims["exp"].as_i64().unwrap() - chrono::Utc::now().timestamp();
    assert!(lifetime > 0 && lifetime <= 24 * 3600, "exp dans les 24 h");

    let other_key = DecodingKey::from_ec_components(
        "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU",
        "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0",
    )
    .unwrap();
    assert!(decode::<Value>(token, &other_key, &validation).is_err());

    // RFC 8291 : seul l'appareil (clé privée + secret d'authentification) peut lire le contenu.
    let decrypted = ece::decrypt(&browser, &auth_secret, body).expect("déchiffrement");
    assert_eq!(
        serde_json::from_slice::<Value>(&decrypted).unwrap(),
        serde_json::to_value(notification()).unwrap()
    );
    assert!(!String::from_utf8_lossy(body).contains("Camille"));
    let (stranger_keys, stranger_secret) = ece::generate_keypair_and_auth_secret().unwrap();
    assert!(
        ece::decrypt(
            &stranger_keys.raw_components().unwrap(),
            &stranger_secret,
            body
        )
        .is_err()
    );
}

#[tokio::test]
async fn push_service_answers_become_outcomes() {
    let (browser_keys, auth_secret) = ece::generate_keypair_and_auth_secret().unwrap();
    let p256dh = base64_url(browser_keys.raw_components().unwrap().public_key());
    let auth = base64_url(&auth_secret);

    for (status, expected) in [
        (410, Some(PushOutcome::Gone)),
        (404, Some(PushOutcome::Gone)),
        (500, None),
    ] {
        let (origin, _) = fake_push_service(status).await;
        let outcome = sender()
            .send(
                &subscription(&format!("{origin}/push/x"), &p256dh, &auth),
                &notification(),
            )
            .await;
        match expected {
            Some(expected) => assert_eq!(outcome, expected),
            None => {
                assert!(matches!(outcome, PushOutcome::Failed(reason) if reason.contains("500")))
            }
        }
    }

    let unreachable = subscription("http://127.0.0.1:9/push/x", &p256dh, &auth);
    assert!(matches!(
        sender().send(&unreachable, &notification()).await,
        PushOutcome::Failed(_)
    ));
    let (origin, received) = fake_push_service(201).await;
    let broken_keys = subscription(&format!("{origin}/push/x"), "cle", "secret");
    assert!(matches!(
        sender().send(&broken_keys, &notification()).await,
        PushOutcome::Failed(_)
    ));
    assert!(
        received.lock().unwrap().is_empty(),
        "rien ne part sans chiffrement"
    );
}

#[test]
fn inconsistent_vapid_configuration_is_refused_at_startup() {
    let other_public =
        "BH_NzidA9sRdQYPL7m_bS3tYBzM1e-nvE7rPbjx70VRFx_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0";
    assert!(WebPushSender::new(VAPID_PRIVATE_KEY, other_public, SUBJECT).is_err());
    assert!(WebPushSender::new("pas-une-cle", VAPID_PUBLIC_KEY, SUBJECT).is_err());
    assert!(WebPushSender::new(VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, "exploitant").is_err());
}

#[tokio::test]
async fn a_node_browser_decrypts_the_notification() {
    let Ok(receiver) = var("TEST_PUSH_RECEIVER_URL") else {
        println!("TEST_PUSH_RECEIVER_URL absent : récepteur Node non essayé");
        return;
    };
    let client = reqwest::Client::new();
    let browser: Value = client
        .get(format!("{receiver}/subscription"))
        .send()
        .await
        .expect("récepteur joignable")
        .json()
        .await
        .unwrap();
    let device = subscription(
        browser["endpoint"].as_str().unwrap(),
        browser["keys"]["p256dh"].as_str().unwrap(),
        browser["keys"]["auth"].as_str().unwrap(),
    );

    let outcome = sender().send(&device, &notification()).await;

    let result: Value = client
        .get(format!("{receiver}/result"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    println!("récepteur Node : {result}");
    assert_eq!(outcome, PushOutcome::Sent, "{result}");
    assert_eq!(result["errors"], json!([]));
    assert_eq!(result["vapid_public_key"], VAPID_PUBLIC_KEY);
    assert_eq!(result["vapid_claims"]["sub"], SUBJECT);
    let decrypted: Value = serde_json::from_str(result["decrypted"].as_str().unwrap()).unwrap();
    assert_eq!(decrypted, serde_json::to_value(notification()).unwrap());
    if result["http_ece_used"] == true {
        assert_eq!(result["decrypted_by_http_ece"], result["decrypted"]);
    }
}
