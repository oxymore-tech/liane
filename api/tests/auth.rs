//! Tests d'intégration de l'authentification : sessions révocables, limites de débit, code à usage unique,
//! compte de démonstration, suppression de compte. Ignorés par défaut : ils exigent `TEST_DATABASE_URL`.

mod common;

use api::auth::sms::{BrevoSmsSender, SmsSender};
use api::config::AuthLimits;
use chrono::{Duration, Utc};
use common::{TestApp, unique_name};
use rand::Rng;
use reqwest::StatusCode;
use serde_json::{Value, json};
use tokio::net::TcpListener;

fn random_phone() -> String {
    format!(
        "+336{:08}",
        rand::rng().random_range(10_000_000..100_000_000)
    )
}

fn random_ip() -> String {
    let mut rng = rand::rng();
    format!(
        "203.{}.{}.{}",
        rng.random_range(0..255),
        rng.random_range(0..255),
        rng.random_range(1..255)
    )
}

/// Un appel d'authentification vu comme venant de `ip` (l'API de test fait confiance à un mandataire).
async fn send_code_from(app: &TestApp, phone: &str, ip: &str) -> StatusCode {
    reqwest::Client::new()
        .post(format!("{}/auth/sms", app.base_url))
        .query(&[("phone", phone)])
        .header("X-Forwarded-For", ip)
        .send()
        .await
        .expect("réponse")
        .status()
}

async fn login_from(app: &TestApp, phone: &str, code: &str, ip: &str) -> StatusCode {
    reqwest::Client::new()
        .post(format!("{}/auth/login", app.base_url))
        .header("X-Forwarded-For", ip)
        .json(&json!({ "phone": phone, "code": code }))
        .send()
        .await
        .expect("réponse")
        .status()
}

fn last_code(app: &TestApp, phone: &str) -> String {
    app.sms.codes_for(phone).pop().expect("code envoyé")
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn logging_out_revokes_the_token_of_this_device_only() {
    let app = TestApp::spawn().await;
    let phone = random_phone();

    assert_eq!(send_code_from(&app, &phone, &random_ip()).await, StatusCode::OK);
    let (status, body) = app
        .post("/auth/login", None, json!({ "phone": phone, "code": last_code(&app, &phone) }))
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["user"]["is_admin"], false);
    assert!(body["user"]["id"].is_string());
    assert!(body["user"].get("iat").is_none() && body["user"].get("exp").is_none());
    let first = body["token"]["access_token"].as_str().unwrap().to_string();

    assert_eq!(send_code_from(&app, &phone, &random_ip()).await, StatusCode::OK);
    let second = app.login(&phone, &last_code(&app, &phone)).await;

    let (status, _) = app.post("/auth/logout", Some(&first), json!({})).await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = app.get("/user/me", Some(&first)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = app.get("/user/me", Some(&second)).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app.get("/user/me", Some("not-a-token")).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn admin_right_is_read_from_the_database_at_each_request() {
    let app = TestApp::spawn().await;
    let (token, id) = app.new_user("Adèle").await;

    let (status, _) = app.get("/liane/admin", Some(&token)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    for (is_admin, expected) in [(true, StatusCode::OK), (false, StatusCode::FORBIDDEN)] {
        sqlx::query(r#"UPDATE "user" SET is_admin = $2 WHERE id = $1::uuid"#)
            .bind(&id)
            .bind(is_admin)
            .execute(&app.db)
            .await
            .unwrap();
        let (status, _) = app.get("/liane/admin", Some(&token)).await;
        assert_eq!(status, expected);
    }
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_code_works_once_expires_and_allows_three_attempts() {
    let app = TestApp::spawn().await;
    let ip = random_ip();

    let phone = random_phone();
    assert_eq!(send_code_from(&app, &phone, &ip).await, StatusCode::OK);
    let code = last_code(&app, &phone);
    assert_eq!(code.len(), 6);
    assert_eq!(login_from(&app, &phone, &code, &ip).await, StatusCode::OK);
    assert_eq!(login_from(&app, &phone, &code, &ip).await, StatusCode::UNAUTHORIZED);

    let phone = random_phone();
    assert_eq!(send_code_from(&app, &phone, &ip).await, StatusCode::OK);
    sqlx::query("UPDATE sms_code SET expires_at = NOW() - INTERVAL '1 second' WHERE phone = $1")
        .bind(&phone)
        .execute(&app.db)
        .await
        .unwrap();
    let code = last_code(&app, &phone);
    assert_eq!(login_from(&app, &phone, &code, &ip).await, StatusCode::UNAUTHORIZED);

    let phone = random_phone();
    assert_eq!(send_code_from(&app, &phone, &ip).await, StatusCode::OK);
    let code = last_code(&app, &phone);
    let wrong = if code == "000001" { "000002" } else { "000001" };
    for _ in 0..3 {
        assert_eq!(login_from(&app, &phone, wrong, &ip).await, StatusCode::UNAUTHORIZED);
    }
    assert_eq!(login_from(&app, &phone, &code, &ip).await, StatusCode::UNAUTHORIZED);

    assert_eq!(send_code_from(&app, "pas un numéro", &ip).await, StatusCode::BAD_REQUEST);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn sending_codes_is_limited_per_phone_and_per_address() {
    let app = TestApp::spawn_with_limits(AuthLimits {
        sms_per_phone: 2,
        sms_per_ip: 3,
        failed_logins_per_ip: 1_000,
    })
    .await;

    let phone = random_phone();
    assert_eq!(send_code_from(&app, &phone, &random_ip()).await, StatusCode::OK);
    assert_eq!(send_code_from(&app, &phone, &random_ip()).await, StatusCode::OK);
    assert_eq!(
        send_code_from(&app, &phone, &random_ip()).await,
        StatusCode::TOO_MANY_REQUESTS
    );
    assert_eq!(app.sms.codes_for(&phone).len(), 2);

    let ip = random_ip();
    for _ in 0..3 {
        assert_eq!(send_code_from(&app, &random_phone(), &ip).await, StatusCode::OK);
    }
    let refused = random_phone();
    assert_eq!(send_code_from(&app, &refused, &ip).await, StatusCode::TOO_MANY_REQUESTS);
    assert!(app.sms.codes_for(&refused).is_empty());
    assert_eq!(send_code_from(&app, &refused, &random_ip()).await, StatusCode::OK);

    // Une adresse inventée par le client en tête de X-Forwarded-For ne compte pas.
    let spoofed = format!("{}, {ip}", random_ip());
    assert_eq!(
        send_code_from(&app, &random_phone(), &spoofed).await,
        StatusCode::TOO_MANY_REQUESTS
    );
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn wrong_codes_are_limited_per_address() {
    let app = TestApp::spawn_with_limits(AuthLimits {
        sms_per_phone: 1_000,
        sms_per_ip: 1_000,
        failed_logins_per_ip: 2,
    })
    .await;
    let ip = random_ip();
    let phone = random_phone();
    assert_eq!(send_code_from(&app, &phone, &ip).await, StatusCode::OK);
    let code = last_code(&app, &phone);
    let wrong = if code == "000001" { "000002" } else { "000001" };

    assert_eq!(login_from(&app, &phone, wrong, &ip).await, StatusCode::UNAUTHORIZED);
    assert_eq!(login_from(&app, &phone, wrong, &ip).await, StatusCode::UNAUTHORIZED);
    assert_eq!(login_from(&app, &phone, &code, &ip).await, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(login_from(&app, &phone, &code, &random_ip()).await, StatusCode::OK);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn the_test_account_only_exists_when_enabled() {
    let enabled = TestApp::spawn().await;
    assert_eq!(
        login_from(&enabled, "+33600000000", "000000", &random_ip()).await,
        StatusCode::OK
    );
    assert_eq!(
        login_from(&enabled, "+33600000000", "111111", &random_ip()).await,
        StatusCode::UNAUTHORIZED
    );

    let disabled = TestApp::spawn_without_test_account().await;
    assert_eq!(
        login_from(&disabled, "+33600000000", "000000", &random_ip()).await,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn health_reports_database_migrations_and_routing() {
    let app = TestApp::spawn().await;
    let (status, health) = app.get("/health", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        health,
        json!({ "status": "ok", "database": "ok", "migrations": "ok", "osrm": "disabled" })
    );

    let unreachable = TestApp::spawn_with_osrm("http://127.0.0.1:9").await;
    let (status, health) = unreachable.get("/health", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(health["osrm"], "failed");

    let osrm = common::fake_osrm(common::FakeOsrm::Route).await;
    let reachable = TestApp::spawn_with_osrm(&osrm).await;
    let (_, health) = reachable.get("/health", None).await;
    assert_eq!(health["osrm"], "ok");
}

fn gesture_at(kind: &str, point: &common::Point) -> Value {
    json!({ "kind": kind, "position": { "lat": point.lat, "lng": point.lng, "accuracy_meters": 15.0 } })
}

async fn count(app: &TestApp, sql: &str, user_id: &str) -> i64 {
    sqlx::query_scalar(sql)
        .bind(user_id)
        .fetch_one(&app.db)
        .await
        .expect("compte")
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn deleting_an_account_erases_it_and_keeps_attested_trips_anonymous() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app
        .create_liane(&admin, &unique_name("Effacement"), &[a, b])
        .await;
    let liane_id = liane["id"].as_str().unwrap();

    let (driver, _) = app.new_member("Denis", liane_id, a, b).await;
    let (leaver, leaver_id) = app.new_member("Léa", liane_id, a, b).await;
    let leaver_phone: String =
        sqlx::query_scalar(r#"SELECT phone FROM "user" WHERE id = $1::uuid"#)
            .bind(&leaver_id)
            .fetch_one(&app.db)
            .await
            .unwrap();
    app.subscribe_device(&leaver).await;
    let driver_device = app.subscribe_device(&driver).await;

    let (status, _) = app
        .post(&format!("/liane/{liane_id}/message"), Some(&leaver), json!({ "text": "Bonjour" }))
        .await;
    assert_eq!(status, StatusCode::OK);

    // Un trajet attesté : Léa passagère, montée et descente déclarées.
    let trip_at = |minutes: i64| json!({ "departure_time": (Utc::now() + Duration::minutes(minutes)).to_rfc3339(), "direction": "Outbound", "seat_count": 2 });
    let (status, attested) = app
        .post(&format!("/liane/{liane_id}/trip"), Some(&driver), trip_at(5))
        .await;
    assert_eq!(status, StatusCode::OK, "{attested}");
    let attested_id = attested["id"].as_str().unwrap();
    let (status, _) = app
        .post(&format!("/trip/{attested_id}/passenger"), Some(&leaver), json!({}))
        .await;
    assert_eq!(status, StatusCode::OK);
    for (token, kind, point) in [(&driver, "Start", a), (&leaver, "Start", a), (&leaver, "End", b), (&driver, "End", b)] {
        let (status, body) = app
            .post(&format!("/trip/{attested_id}/gesture"), Some(token), gesture_at(kind, point))
            .await;
        assert_eq!(status, StatusCode::OK, "{body}");
    }

    // Un trajet à venir que Léa conduit, avec Denis inscrit ; un autre où elle est seulement inscrite.
    let (status, driven) = app
        .post(&format!("/liane/{liane_id}/trip"), Some(&leaver), trip_at(600))
        .await;
    assert_eq!(status, StatusCode::OK, "{driven}");
    let driven_id = driven["id"].as_str().unwrap();
    let (status, _) = app
        .post(&format!("/trip/{driven_id}/passenger"), Some(&driver), json!({}))
        .await;
    assert_eq!(status, StatusCode::OK);
    let (status, booked) = app
        .post(&format!("/liane/{liane_id}/trip"), Some(&driver), trip_at(900))
        .await;
    assert_eq!(status, StatusCode::OK);
    let booked_id = booked["id"].as_str().unwrap();
    let (status, _) = app
        .post(&format!("/trip/{booked_id}/passenger"), Some(&leaver), json!({}))
        .await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = app.delete("/user/me", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, body) = app.delete("/user/me", Some(&leaver)).await;
    assert_eq!(status, StatusCode::OK, "{body}");

    // Le jeton ne vaut plus rien, le passager du trajet annulé est prévenu.
    let (status, _) = app.get("/user/me", Some(&leaver)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    app.pushes.expect(&driver_device, "annulé").await;

    let (phone, pseudo, first_name, last_name, is_deleted, identity_key, phone_trunc): (
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        bool,
        Option<String>,
        Option<String>,
    ) = sqlx::query_as(
        r#"SELECT phone, pseudo, first_name, last_name, deleted_at IS NOT NULL, proof_identity_key, proof_phone_trunc
           FROM "user" WHERE id = $1::uuid"#,
    )
    .bind(&leaver_id)
    .fetch_one(&app.db)
    .await
    .unwrap();
    assert!(phone.starts_with("deleted-"));
    assert_eq!((pseudo, first_name, last_name), (None, None, None));
    assert!(is_deleted);
    assert_eq!(
        identity_key.as_deref(),
        Some(api::user::identity::identity_key(&leaver_phone, "Test").as_str())
    );
    assert_eq!(phone_trunc.as_deref(), Some(&leaver_phone[..leaver_phone.len() - 2]));

    for (table, expected) in [
        ("liane_member", 0),
        ("liane_message", 0),
        ("push_subscription", 0),
        ("user_session", 0),
        ("trip_member", 1),
        ("trip_event", 2),
    ] {
        let found = count(
            &app,
            &format!("SELECT COUNT(*) FROM {table} WHERE user_id = $1::uuid"),
            &leaver_id,
        )
        .await;
        assert_eq!(found, expected, "{table}");
    }
    assert_eq!(
        count(&app, "SELECT COUNT(*) FROM trip WHERE driver_id = $1::uuid", &leaver_id).await,
        0
    );

    // Les autres membres voient toujours le trajet attesté, sans nom pour le compte supprimé.
    let (status, trip) = app.get(&format!("/trip/{attested_id}"), Some(&driver)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(trip["passengers"][0]["user"]["id"], leaver_id.as_str());
    assert!(trip["passengers"][0]["user"]["pseudo"].is_null());
    let (status, _) = app.get(&format!("/trip/{driven_id}"), Some(&driver)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (_, liane) = app.get(&format!("/liane/{}", liane["slug"].as_str().unwrap()), Some(&driver)).await;
    assert_eq!(liane["member_count"], 1);

    // Le numéro est libre : se réinscrire crée un compte neuf.
    assert_eq!(send_code_from(&app, &leaver_phone, &random_ip()).await, StatusCode::OK);
    let again = app.login(&leaver_phone, &last_code(&app, &leaver_phone)).await;
    let (status, me) = app.get("/user/me", Some(&again)).await;
    assert_eq!(status, StatusCode::OK);
    assert_ne!(me["id"], leaver_id.as_str());
    assert!(me["first_name"].is_null());
}

/// Un faux Brevo local : garde la requête reçue et répond avec le statut demandé.
async fn fake_brevo(status: u16) -> (String, std::sync::Arc<std::sync::Mutex<Vec<(Option<String>, Value)>>>) {
    use axum::http::{HeaderMap, StatusCode as Status};
    use axum::routing::post;

    let received = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let store = received.clone();
    let handler = move |headers: HeaderMap, axum::Json(body): axum::Json<Value>| async move {
        let api_key = headers
            .get("api-key")
            .and_then(|value| value.to_str().ok())
            .map(str::to_string);
        store.lock().unwrap().push((api_key, body));
        (Status::from_u16(status).unwrap(), json!({ "messageId": 1 }).to_string())
    };
    let app = axum::Router::new().route("/v3/transactionalSMS/sms", post(handler));
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("port local");
    let url = format!("http://{}/v3/transactionalSMS/sms", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, app).await });
    (url, received)
}

#[tokio::test]
async fn brevo_sender_posts_a_transactional_sms() {
    let (url, received) = fake_brevo(201).await;
    let sender = BrevoSmsSender::new(&url, "cle-factice", "Liane");

    sender.send_code("+33612345678", "123456").await.expect("envoi accepté");

    let received = received.lock().unwrap();
    let (api_key, body) = &received[0];
    assert_eq!(api_key.as_deref(), Some("cle-factice"));
    assert_eq!(body["sender"], "Liane");
    assert_eq!(body["recipient"], "33612345678");
    assert_eq!(body["type"], "transactional");
    assert!(body["content"].as_str().unwrap().contains("123456"));
}

#[tokio::test]
async fn brevo_sender_reports_a_refusal_without_leaking_the_key() {
    let (url, _) = fake_brevo(401).await;
    let sender = BrevoSmsSender::new(&url, "cle-factice", "Liane");
    let error = sender.send_code("+33612345678", "123456").await.unwrap_err();
    assert!(error.contains("401"));
    assert!(!error.contains("cle-factice"));

    let unreachable = BrevoSmsSender::new("http://127.0.0.1:9/sms", "cle-factice", "Liane");
    let error = unreachable.send_code("+33612345678", "123456").await.unwrap_err();
    assert!(error.contains("unreachable"));
}
