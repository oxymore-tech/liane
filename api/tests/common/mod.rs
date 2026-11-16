use std::env::var;
use std::f64::consts::PI;

use api::config::{Config, Keys};
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

/// Une API complète sur un port local, branchée sur la base `TEST_DATABASE_URL`.
/// Les tests partagent la base : chacun travaille dans sa propre zone géographique
/// et ne vérifie que ses propres données.
pub struct TestApp {
    pub db: PgPool,
    base_url: String,
    client: reqwest::Client,
    origin: (f64, f64),
}

pub struct Point {
    pub id: Uuid,
    pub lat: f64,
    pub lng: f64,
}

impl TestApp {
    pub async fn spawn() -> Self {
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
            osrm_url: String::new(),
            auth_test_account: Some(ADMIN_PHONE.to_string()),
            auth_test_code: Some(ADMIN_CODE.to_string()),
        };
        let app = api_router()
            .layer(Extension(db.clone()))
            .layer(Extension(config));

        let listener = TcpListener::bind("127.0.0.1:0").await.expect("port local");
        let base_url = format!("http://{}/api", listener.local_addr().expect("adresse"));
        tokio::spawn(async move { axum::serve(listener, app).await });

        let mut rng = rand::rng();
        Self {
            db,
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
            let id: Uuid = sqlx::query_scalar(
                r#"
                    INSERT INTO rallying_point (label, location, kind, city)
                    VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, 'TownHall', $1)
                    RETURNING id
                "#,
            )
            .bind(format!("Arrêt {index}"))
            .bind(lat)
            .bind(lng)
            .fetch_one(&self.db)
            .await
            .expect("point de ralliement");
            points.push(Point { id, lat, lng });
        }
        points
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
