//! Tests d'intégration des abonnements aux notifications. Le service de push est un faux :
//! rien ne sort. Ignorés par défaut : ils exigent `TEST_DATABASE_URL`.

mod common;

use common::{TEST_VAPID_PUBLIC_KEY, TestApp, unique_name};
use reqwest::{Method, StatusCode};
use serde_json::json;

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn devices_subscribe_receive_and_unsubscribe() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app
        .create_liane(&admin, &unique_name("Push"), &[a, b])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let (writer, _) = app.new_member("Wanda", liane_id, a, b).await;
    let (reader, reader_id) = app.new_member("Rachid", liane_id, a, b).await;
    let messages = format!("/liane/{liane_id}/message");

    let (status, config) = app.get("/push/config", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(config["vapid_public_key"], TEST_VAPID_PUBLIC_KEY);

    let subscription = |endpoint: &str| json!({ "endpoint": endpoint, "keys": { "p256dh": "cle", "auth": "secret" } });
    let (status, _) = app
        .post(
            "/push/subscription",
            None,
            subscription("https://push.invalid/x"),
        )
        .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    for refused in [
        subscription("http://push.invalid/sans-tls"),
        subscription("javascript:alert(1)"),
        json!({ "endpoint": "https://push.invalid/x", "keys": { "p256dh": "", "auth": "secret" } }),
    ] {
        let (status, _) = app.post("/push/subscription", Some(&reader), refused).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    // Deux appareils pour le même compte ; s'abonner deux fois avec le même appareil ne le double pas.
    let phone = app.subscribe_device(&reader).await;
    let tablet = app.subscribe_device(&reader).await;
    let (status, _) = app
        .post("/push/subscription", Some(&reader), subscription(&phone))
        .await;
    assert_eq!(status, StatusCode::OK);
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM push_subscription WHERE user_id = $1::uuid")
            .bind(&reader_id)
            .fetch_one(&app.db)
            .await
            .unwrap();
    assert_eq!(count, 2);

    let (status, _) = app
        .post(&messages, Some(&writer), json!({ "text": "Premier" }))
        .await;
    assert_eq!(status, StatusCode::OK);
    for device in [&phone, &tablet] {
        let notification = app.pushes.expect(device, "Wanda T.").await;
        assert_eq!(notification.body, "Premier");
        assert_eq!(notification.tag, format!("liane-message-{liane_id}"));
    }
    assert_eq!(app.pushes.sent_to(&phone).len(), 1);

    // Désabonnement d'un appareil : seul le sien, et seulement par son propriétaire.
    let unsubscribe = json!({ "endpoint": tablet });
    let (status, _) = app
        .call(
            Method::DELETE,
            "/push/subscription",
            Some(&writer),
            Some(unsubscribe.clone()),
        )
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, _) = app
        .call(
            Method::DELETE,
            "/push/subscription",
            Some(&reader),
            Some(unsubscribe),
        )
        .await;
    assert_eq!(status, StatusCode::OK);

    // Un appareil que le service de push déclare disparu est oublié après le premier envoi.
    let gone = "https://push.invalid/gone-device";
    let (status, _) = app
        .post("/push/subscription", Some(&reader), subscription(gone))
        .await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = app
        .post(&messages, Some(&writer), json!({ "text": "Second" }))
        .await;
    assert_eq!(status, StatusCode::OK);
    app.pushes.settle().await;
    assert_eq!(app.pushes.sent_to(&phone).last().unwrap().body, "Second");
    assert_eq!(app.pushes.sent_to(&tablet).len(), 1);
    assert_eq!(app.pushes.sent_to(gone).len(), 1);
    let remaining: Vec<String> = sqlx::query_scalar(
        "SELECT endpoint FROM push_subscription WHERE user_id = $1::uuid ORDER BY created_at",
    )
    .bind(&reader_id)
    .fetch_all(&app.db)
    .await
    .unwrap();
    assert_eq!(remaining, std::slice::from_ref(&phone));

    // Un téléphone partagé qui change de compte ne reçoit plus les notifications de l'ancien.
    let (status, _) = app
        .post("/push/subscription", Some(&writer), subscription(&phone))
        .await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app
        .post(&messages, Some(&writer), json!({ "text": "Troisième" }))
        .await;
    assert_eq!(status, StatusCode::OK);
    app.pushes.settle().await;
    assert_eq!(app.pushes.sent_to(&phone).len(), 2);
}
