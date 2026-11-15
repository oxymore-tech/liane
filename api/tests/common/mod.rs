#![allow(dead_code)]

use std::env::var;
use std::f64::consts::PI;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use api::config::{Config, Keys};
use api::notification::Notifier;
use api::notification::push::{
    PushFuture, PushNotification, PushOutcome, PushSender, PushSubscription,
};
use api::router::api_router;
use axum::Extension;
use rand::Rng;
use reqwest::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use uuid::Uuid;

const ADMIN_PHONE: &str = "+33600000000";
const ADMIN_CODE: &str = "000000";
pub const TEST_VAPID_PUBLIC_KEY: &str = "cle-publique-vapid-de-test";

/// Une API complète sur un port local, branchée sur la base `TEST_DATABASE_URL`.
/// Les tests partagent la base : chacun travaille dans sa propre zone géographique
/// et ne vérifie que ses propres données.
pub struct TestApp {
    pub db: PgPool,
    pub pushes: Arc<RecordingPushSender>,
    pub base_url: String,
    client: reqwest::Client,
    origin: (f64, f64),
}

/// Le faux service de push des tests : rien ne sort, chaque notification est gardée en mémoire.
/// Un appareil dont l'adresse contient « gone » répond qu'il n'existe plus.
#[derive(Default)]
pub struct RecordingPushSender {
    sent: Mutex<Vec<(PushSubscription, PushNotification)>>,
}

impl PushSender for RecordingPushSender {
    fn send<'a>(
        &'a self,
        subscription: &'a PushSubscription,
        notification: &'a PushNotification,
    ) -> PushFuture<'a> {
        Box::pin(async move {
            self.sent
                .lock()
                .expect("notifications")
                .push((subscription.clone(), notification.clone()));
            if subscription.endpoint.contains("gone") {
                PushOutcome::Gone
            } else {
                PushOutcome::Sent
            }
        })
    }
}

impl RecordingPushSender {
    /// Notifications envoyées à un appareil, repéré par l'adresse de son abonnement.
    pub fn sent_to(&self, endpoint: &str) -> Vec<PushNotification> {
        self.sent
            .lock()
            .expect("notifications")
            .iter()
            .filter(|(subscription, _)| subscription.endpoint == endpoint)
            .map(|(_, notification)| notification.clone())
            .collect()
    }

    /// Les notifications partent en tâche de fond : attend celle dont le titre contient `title`.
    pub async fn expect(&self, endpoint: &str, title: &str) -> PushNotification {
        for _ in 0..100 {
            let found = self
                .sent_to(endpoint)
                .into_iter()
                .rev()
                .find(|notification| notification.title.contains(title));
            if let Some(notification) = found {
                return notification;
            }
            tokio::time::sleep(Duration::from_millis(30)).await;
        }
        panic!(
            "aucune notification « {title} » pour {endpoint} ; reçues : {:?}",
            self.sent_to(endpoint)
        );
    }

    /// Laisse le temps aux envois en cours de se terminer avant de vérifier qu'il n'y a rien eu.
    pub async fn settle(&self) {
        tokio::time::sleep(Duration::from_millis(300)).await;
    }
}

pub struct Point {
    pub id: Uuid,
    pub lat: f64,
    pub lng: f64,
}

impl TestApp {
    /// Sans OSRM : les tracés sont des lignes droites.
    pub async fn spawn() -> Self {
        Self::spawn_with_osrm("").await
    }

    pub async fn spawn_with_osrm(osrm_url: &str) -> Self {
        let database_url = var("TEST_DATABASE_URL")
            .expect("TEST_DATABASE_URL doit désigner une base PostgreSQL + PostGIS jetable");
        let db = PgPoolOptions::new()
            .max_connections(5)
            .connect(&database_url)
            .await
            .expect("connexion à la base de test");
        sqlx::migrate!().run(&db).await.expect("migrations");

        sqlx::query(
            r#"INSERT INTO "user" (phone, is_admin) VALUES ($1, true) ON CONFLICT (phone) DO NOTHING"#,
        )
        .bind(ADMIN_PHONE)
        .execute(&db)
        .await
        .expect("compte administrateur");

        let config = Config {
            auth_keys: Keys::new(b"integration-test-secret"),
            sms_api_key: String::new(),
            osrm_url: osrm_url.to_string(),
            auth_test_account: Some(ADMIN_PHONE.to_string()),
            auth_test_code: Some(ADMIN_CODE.to_string()),
            vapid_public_key: Some(TEST_VAPID_PUBLIC_KEY.to_string()),
        };
        let pushes = Arc::new(RecordingPushSender::default());
        let app = api_router()
            .layer(Extension(db.clone()))
            .layer(Extension(config))
            .layer(Extension(Notifier::new(pushes.clone())));

        let listener = TcpListener::bind("127.0.0.1:0").await.expect("port local");
        let base_url = format!("http://{}/api", listener.local_addr().expect("adresse"));
        tokio::spawn(async move { axum::serve(listener, app).await });

        let mut rng = rand::rng();
        Self {
            db,
            pushes,
            base_url,
            client: reqwest::Client::new(),
            origin: (
                rng.random_range(-60.0..60.0),
                rng.random_range(-170.0..170.0),
            ),
        }
    }

    pub async fn call(
        &self,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<Value>,
    ) -> (StatusCode, Value) {
        let mut request = self
            .client
            .request(method, format!("{}{path}", self.base_url));
        if let Some(token) = token {
            request = request.bearer_auth(token);
        }
        if let Some(body) = body {
            request = request.json(&body);
        }
        let response = request.send().await.expect("réponse HTTP");
        let status = response.status();
        let text = response.text().await.expect("corps de réponse");
        (
            status,
            serde_json::from_str(&text).unwrap_or(Value::String(text)),
        )
    }

    pub async fn get(&self, path: &str, token: Option<&str>) -> (StatusCode, Value) {
        self.call(Method::GET, path, token, None).await
    }

    pub async fn post(&self, path: &str, token: Option<&str>, body: Value) -> (StatusCode, Value) {
        self.call(Method::POST, path, token, Some(body)).await
    }

    pub async fn put(&self, path: &str, token: Option<&str>, body: Value) -> (StatusCode, Value) {
        self.call(Method::PUT, path, token, Some(body)).await
    }

    pub async fn delete(&self, path: &str, token: Option<&str>) -> (StatusCode, Value) {
        self.call(Method::DELETE, path, token, None).await
    }

    pub async fn admin_token(&self) -> String {
        self.login(ADMIN_PHONE, ADMIN_CODE).await
    }

    /// Crée un utilisateur ordinaire par le parcours réel (code lu en base) et renvoie (jeton, id).
    pub async fn new_user(&self, first_name: &str) -> (String, String) {
        let phone = format!(
            "+336{:08}",
            rand::rng().random_range(10_000_000..100_000_000)
        );
        let (status, _) = self
            .call(
                Method::POST,
                &format!("/auth/sms?phone=%2B{}", &phone[1..]),
                None,
                None,
            )
            .await;
        assert_eq!(status, StatusCode::OK);

        let code: String = sqlx::query_scalar("SELECT code FROM sms_code WHERE phone = $1")
            .bind(&phone)
            .fetch_one(&self.db)
            .await
            .expect("code SMS");
        let token = self.login(&phone, &code).await;

        let (status, user) = self
            .put(
                "/user/me",
                Some(&token),
                json!({ "first_name": first_name, "last_name": "Test", "gender": "Unspecified", "picture_url": null }),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        (
            token,
            user["id"].as_str().expect("id utilisateur").to_string(),
        )
    }

    /// Abonne un appareil factice aux notifications et renvoie l'adresse de son abonnement.
    pub async fn subscribe_device(&self, token: &str) -> String {
        let endpoint = format!("https://push.invalid/{}", Uuid::now_v7().simple());
        let (status, _) = self
            .post(
                "/push/subscription",
                Some(token),
                json!({ "endpoint": endpoint, "keys": { "p256dh": "cle", "auth": "secret" } }),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        endpoint
    }

    /// Un utilisateur qui rejoint une liane sur un tronçon, tous les jours, dans les deux sens.
    pub async fn new_member(
        &self,
        first_name: &str,
        liane_id: &str,
        board: &Point,
        alight: &Point,
    ) -> (String, String) {
        let (token, id) = self.new_user(first_name).await;
        let (status, body) = self
            .post(
                &format!("/liane/{liane_id}/membership"),
                Some(&token),
                membership(board, alight, "1111111", "Both", true),
            )
            .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        (token, id)
    }

    async fn login(&self, phone: &str, code: &str) -> String {
        let (status, body) = self
            .post("/auth/login", None, json!({ "phone": phone, "code": code }))
            .await;
        assert_eq!(status, StatusCode::OK);
        body["token"]["access_token"]
            .as_str()
            .expect("jeton")
            .to_string()
    }

    /// Crée des points de ralliement alignés, espacés d'environ 11 km, dans la zone du test.
    pub async fn points(&self, count: usize) -> Vec<Point> {
        let mut points = Vec::new();
        for index in 0..count {
            let (lat, lng) = (self.origin.0, self.origin.1 + 0.1 * index as f64);
            points.push(self.point_at(&format!("Arrêt {index}"), lat, lng).await);
        }
        points
    }

    pub async fn point_at(&self, label: &str, lat: f64, lng: f64) -> Point {
        let id: Uuid = sqlx::query_scalar(
            r#"
                INSERT INTO rallying_point (label, location, kind, city)
                VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, 'TownHall', $1)
                RETURNING id
            "#,
        )
        .bind(label)
        .bind(lat)
        .bind(lng)
        .fetch_one(&self.db)
        .await
        .expect("point de ralliement");
        Point { id, lat, lng }
    }

    pub async fn create_liane(&self, admin: &str, name: &str, stops: &[&Point]) -> Value {
        let stop_ids: Vec<Uuid> = stops.iter().map(|point| point.id).collect();
        let (status, liane) = self
            .post(
                "/liane",
                Some(admin),
                json!({ "name": name, "stop_ids": stop_ids }),
            )
            .await;
        assert_eq!(status, StatusCode::OK, "{liane}");
        liane
    }
}

pub fn membership(
    board: &Point,
    alight: &Point,
    week_days: &str,
    direction: &str,
    can_drive: bool,
) -> Value {
    json!({
        "board_stop_id": board.id,
        "alight_stop_id": alight.id,
        "week_days": week_days,
        "direction": direction,
        "can_drive": can_drive,
    })
}

pub fn unique_name(prefix: &str) -> String {
    format!("{prefix} {}", Uuid::now_v7().simple())
}

pub fn contains_id(list: &Value, id: &Value) -> bool {
    list.as_array()
        .expect("liste")
        .iter()
        .any(|item| &item["id"] == id || &item["liane"]["id"] == id)
}

/// Coordonnées de la tuile XYZ qui contient un point.
pub fn tile_of(point: &Point, zoom: u32) -> (i32, i32) {
    let scale = f64::from(1u32 << zoom);
    let x = (point.lng + 180.0) / 360.0 * scale;
    let lat = point.lat.to_radians();
    let y = (1.0 - (lat.tan() + 1.0 / lat.cos()).ln() / PI) / 2.0 * scale;
    (x.floor() as i32, y.floor() as i32)
}

/// Ce que répond le faux serveur OSRM des tests.
#[derive(Clone, Copy)]
pub enum FakeOsrm {
    /// Un tracé de trois points par tronçon, 1 000 m et 60 s par tronçon.
    Route,
    NoRoute,
    BrokenGateway,
    /// Répond après le délai toléré par l'API.
    TooSlow,
}

/// Lance un faux serveur OSRM sur un port local et renvoie son URL.
pub async fn fake_osrm(behaviour: FakeOsrm) -> String {
    use axum::extract::Path;
    use axum::http::StatusCode as Status;
    use axum::routing::get;

    let route = move |Path(coordinates): Path<String>| async move {
        match behaviour {
            FakeOsrm::Route => (Status::OK, fake_route(&coordinates).to_string()),
            FakeOsrm::NoRoute => (
                Status::BAD_REQUEST,
                json!({ "code": "NoRoute", "message": "Impossible route between points" })
                    .to_string(),
            ),
            FakeOsrm::BrokenGateway => {
                (Status::BAD_GATEWAY, "<html>Bad Gateway</html>".to_string())
            }
            FakeOsrm::TooSlow => {
                tokio::time::sleep(std::time::Duration::from_secs(8)).await;
                (Status::OK, fake_route(&coordinates).to_string())
            }
        }
    };
    let app = axum::Router::new().route("/route/v1/driving/{coordinates}", get(route));

    let listener = TcpListener::bind("127.0.0.1:0").await.expect("port local");
    let url = format!("http://{}", listener.local_addr().expect("adresse"));
    tokio::spawn(async move { axum::serve(listener, app).await });
    url
}

fn fake_route(coordinates: &str) -> Value {
    let stops: Vec<[f64; 2]> = coordinates
        .split(';')
        .map(|pair| {
            let (lng, lat) = pair.split_once(',').expect("lon,lat");
            [lng.parse().expect("lon"), lat.parse().expect("lat")]
        })
        .collect();

    let mut line = vec![stops[0]];
    for pair in stops.windows(2) {
        line.push([
            (pair[0][0] + pair[1][0]) / 2.0,
            (pair[0][1] + pair[1][1]) / 2.0 + 0.01,
        ]);
        line.push(pair[1]);
    }
    let leg_count = stops.len() - 1;
    let legs: Vec<Value> = (0..leg_count)
        .map(|_| json!({ "distance": 1000.0, "duration": 60.0 }))
        .collect();
    json!({
        "code": "Ok",
        "routes": [{
            "distance": 1000.0 * leg_count as f64,
            "duration": 60.0 * leg_count as f64,
            "geometry": { "type": "LineString", "coordinates": line },
            "legs": legs,
        }],
    })
}
