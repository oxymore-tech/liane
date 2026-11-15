//! Tests d'intégration du fil de messages d'une liane, contre une vraie base PostgreSQL + PostGIS.
//! Ignorés par défaut : ils exigent `TEST_DATABASE_URL`.

mod common;

use std::time::Duration;

use chrono::Utc;
use common::{TestApp, unique_name};
use reqwest::StatusCode;
use serde_json::{Value, json};

fn texts(page: &Value) -> Vec<&str> {
    page["messages"]
        .as_array()
        .expect("messages")
        .iter()
        .map(|message| message["text"].as_str().expect("texte"))
        .collect()
}

fn unread(mine: &Value, liane_id: &str) -> i64 {
    mine.as_array()
        .expect("mes lianes")
        .iter()
        .find(|liane| liane["id"] == liane_id)
        .expect("liane rejointe")["unread_count"]
        .as_i64()
        .expect("compteur")
}

/// Lit le fil en direct jusqu'à y trouver `expected`.
async fn read_until(stream: &mut reqwest::Response, expected: &str) -> String {
    let mut received = String::new();
    while !received.contains(expected) {
        let chunk = tokio::time::timeout(Duration::from_secs(5), stream.chunk())
            .await
            .unwrap_or_else(|_| panic!("« {expected} » absent du fil en direct : {received}"))
            .expect("fil en direct")
            .expect("fil en direct interrompu");
        received.push_str(&String::from_utf8_lossy(&chunk));
    }
    received
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn members_talk_in_their_liane_and_nobody_else_sees_anything() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app.create_liane(&admin, &unique_name("Fil"), &[a, b]).await;
    let liane_id = liane["id"].as_str().unwrap();
    let slug = liane["slug"].as_str().unwrap();
    let messages = format!("/liane/{liane_id}/message");

    let (alice, alice_id) = app.new_member("Alice", liane_id, a, b).await;
    let (bruno, _) = app.new_member("Bruno", liane_id, a, b).await;
    let (outsider, _) = app.new_user("Olga").await;
    let alice_device = app.subscribe_device(&alice).await;
    let bruno_phone = app.subscribe_device(&bruno).await;
    let bruno_tablet = app.subscribe_device(&bruno).await;
    let outsider_device = app.subscribe_device(&outsider).await;

    // Un anonyme ou un non-membre ne lit rien, n'écrit rien, n'écoute rien.
    for path in [messages.clone(), format!("{messages}/stream")] {
        let (status, _) = app.get(&path, None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        let (status, _) = app.get(&path, Some(&outsider)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }
    let hello = json!({ "text": "Bonjour à tous" });
    let (status, _) = app.post(&messages, None, hello.clone()).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = app.post(&messages, Some(&outsider), hello.clone()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app
        .post(&format!("{messages}/read"), Some(&outsider), json!({}))
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (_, public) = app.get(&format!("/liane/{slug}"), None).await;
    assert!(!public.to_string().contains("message"));

    // Les entrées dans la liane sont annoncées dans le fil.
    let (status, page) = app.get(&messages, Some(&alice)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        texts(&page),
        ["Bruno T. a rejoint la liane", "Alice T. a rejoint la liane"]
    );
    assert_eq!(page["messages"][0]["kind"], "MemberJoined");
    assert_eq!(page["has_more"], false);

    for refused in ["", "   ", &"x".repeat(2_001)] {
        let (status, _) = app
            .post(&messages, Some(&alice), json!({ "text": refused }))
            .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    // Bruno écoute le fil en direct ; Alice écrit.
    let mut live = reqwest::Client::new()
        .get(format!("{}{messages}/stream", app.base_url))
        .bearer_auth(&bruno)
        .send()
        .await
        .expect("fil en direct");
    assert_eq!(live.status(), StatusCode::OK);
    assert_eq!(live.headers()["content-type"], "text/event-stream");

    let (status, sent) = app.post(&messages, Some(&alice), hello).await;
    assert_eq!(status, StatusCode::OK, "{sent}");
    assert_eq!(sent["kind"], "Text");
    assert_eq!(sent["text"], "Bonjour à tous");
    assert_eq!(sent["author"]["id"], alice_id);
    assert_eq!(sent["author"]["pseudo"], "Alice T.");
    let received = read_until(&mut live, "Bonjour à tous").await;
    assert!(received.contains("event: message"));
    assert!(received.contains(sent["id"].as_str().unwrap()));

    // Les autres membres sont notifiés sur tous leurs appareils ; ni l'auteur, ni un non-membre.
    for device in [&bruno_phone, &bruno_tablet] {
        let notification = app.pushes.expect(device, "Alice T.").await;
        assert_eq!(notification.body, "Bonjour à tous");
        assert_eq!(notification.url, format!("/l/{slug}/messages"));
    }
    app.pushes.settle().await;
    assert!(app.pushes.sent_to(&alice_device).is_empty());
    assert!(app.pushes.sent_to(&outsider_device).is_empty());

    // Non-lus : les messages des autres depuis la dernière lecture, jamais les siens.
    let (_, mine) = app.get("/liane/mine", Some(&bruno)).await;
    assert_eq!(unread(&mine, liane_id), 1);
    let (_, mine) = app.get("/liane/mine", Some(&alice)).await;
    assert_eq!(unread(&mine, liane_id), 0);
    let (status, _) = app
        .post(&format!("{messages}/read"), Some(&bruno), json!({}))
        .await;
    assert_eq!(status, StatusCode::OK);
    let (_, mine) = app.get("/liane/mine", Some(&bruno)).await;
    assert_eq!(unread(&mine, liane_id), 0);

    // Lecture paginée, du plus récent au plus ancien.
    for index in 1..=4 {
        let (status, _) = app
            .post(
                &messages,
                Some(&bruno),
                json!({ "text": format!("Message {index}") }),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
    }
    let (_, mine) = app.get("/liane/mine", Some(&alice)).await;
    assert_eq!(unread(&mine, liane_id), 4);
    let (_, first_page) = app.get(&format!("{messages}?limit=3"), Some(&alice)).await;
    assert_eq!(texts(&first_page), ["Message 4", "Message 3", "Message 2"]);
    assert_eq!(first_page["has_more"], true);
    let cursor = first_page["messages"][2]["id"].as_str().unwrap();
    let (_, second_page) = app
        .get(&format!("{messages}?limit=3&before={cursor}"), Some(&alice))
        .await;
    assert_eq!(
        texts(&second_page),
        ["Message 1", "Bonjour à tous", "Bruno T. a rejoint la liane"]
    );
    assert_eq!(second_page["has_more"], true);
    let cursor = second_page["messages"][2]["id"].as_str().unwrap();
    let (_, last_page) = app
        .get(&format!("{messages}?limit=3&before={cursor}"), Some(&alice))
        .await;
    assert_eq!(texts(&last_page), ["Alice T. a rejoint la liane"]);
    assert_eq!(last_page["has_more"], false);

    // Les événements des trajets arrivent dans le fil, avec le trajet concerné.
    let (status, trip) = app
        .post(
            &format!("/liane/{liane_id}/trip"),
            Some(&alice),
            json!({
                "departure_time": (Utc::now() + chrono::Duration::minutes(5)).to_rfc3339(),
                "direction": "Outbound",
                "seat_count": 3,
            }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{trip}");
    let trip_id = trip["id"].as_str().unwrap();
    let received = read_until(&mut live, "TripProposed").await;
    assert!(received.contains(trip_id));
    let gesture = format!("/trip/{trip_id}/gesture");
    for kind in ["Start", "End"] {
        let (status, _) = app
            .post(&gesture, Some(&alice), json!({ "kind": kind }))
            .await;
        assert_eq!(status, StatusCode::OK);
    }
    let (status, canceled) = app
        .post(
            &format!("/liane/{liane_id}/trip"),
            Some(&alice),
            json!({
                "departure_time": (Utc::now() + chrono::Duration::days(1)).to_rfc3339(),
                "direction": "Return",
                "seat_count": 3,
            }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{canceled}");
    let (status, _) = app
        .delete(
            &format!("/trip/{}", canceled["id"].as_str().unwrap()),
            Some(&alice),
        )
        .await;
    assert_eq!(status, StatusCode::OK);

    let (_, page) = app.get(&format!("{messages}?limit=5"), Some(&bruno)).await;
    let kinds: Vec<&str> = page["messages"]
        .as_array()
        .unwrap()
        .iter()
        .map(|message| message["kind"].as_str().unwrap())
        .collect();
    assert_eq!(
        kinds,
        [
            "TripCanceled",
            "TripProposed",
            "TripFinished",
            "TripStarted",
            "TripProposed"
        ]
    );
    let lines = texts(&page);
    assert!(lines[0].starts_with("Alice T. a annulé le trajet Arrêt 1 → Arrêt 0 du "));
    assert_eq!(lines[2], "Alice T. est arrivé à Arrêt 1");
    assert_eq!(lines[3], "Alice T. est parti de Arrêt 0");
    assert!(lines[4].starts_with("Alice T. propose un trajet Arrêt 0 → Arrêt 1, "));
    assert_eq!(page["messages"][3]["data"]["trip_id"], trip_id);

    // Bruno quitte la liane : c'est annoncé, il ne reçoit plus rien et ne lit plus rien.
    let (status, _) = app
        .delete(&format!("/liane/{liane_id}/membership"), Some(&bruno))
        .await;
    assert_eq!(status, StatusCode::OK);
    let (_, page) = app.get(&format!("{messages}?limit=1"), Some(&alice)).await;
    assert_eq!(texts(&page), ["Bruno T. a quitté la liane"]);
    assert_eq!(page["messages"][0]["kind"], "MemberLeft");
    let (status, _) = app.get(&messages, Some(&bruno)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let before = app.pushes.sent_to(&bruno_phone).len();
    let (status, _) = app
        .post(&messages, Some(&alice), json!({ "text": "Entre nous" }))
        .await;
    assert_eq!(status, StatusCode::OK);
    app.pushes.settle().await;
    assert_eq!(app.pushes.sent_to(&bruno_phone).len(), before);
    let ended = tokio::time::timeout(Duration::from_secs(5), async {
        let mut rest = String::new();
        while let Ok(Some(chunk)) = live.chunk().await {
            rest.push_str(&String::from_utf8_lossy(&chunk));
        }
        rest
    })
    .await
    .expect("le fil en direct d'un ancien membre se ferme");
    assert!(!ended.contains("Entre nous"));
}
