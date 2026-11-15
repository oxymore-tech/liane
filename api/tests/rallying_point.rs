//! Régénération des points de ralliement par clé stable. Ignorés par défaut : ils exigent `TEST_DATABASE_URL`.

mod common;

use api::rallying_point::generate::{SourcePoint, SyncReport, sync};
use api::rallying_point::model::RallyingPointKind;
use common::{Point, TestApp, membership, unique_name};
use reqwest::StatusCode;
use serde_json::json;
use uuid::Uuid;

struct Source {
    name: String,
    lat: f64,
    lng: f64,
}

impl Source {
    /// Chaque test a sa propre source et sa propre zone : la base est partagée.
    fn new(app: &TestApp) -> Self {
        let origin = app_origin(app);
        Self {
            name: format!("test{}", Uuid::new_v4().simple()),
            lat: origin.0,
            lng: origin.1,
        }
    }

    fn point(&self, id: &str, label: &str, index: usize) -> SourcePoint {
        SourcePoint {
            source_key: format!("{}:{id}", self.name),
            label: label.to_string(),
            lat: self.lat,
            lng: self.lng + 0.1 * index as f64,
            kind: RallyingPointKind::TownHall,
            address: "1 place de la Mairie".to_string(),
            zip_code: "48000".to_string(),
            city: label.to_string(),
            place_count: None,
        }
    }
}

fn app_origin(app: &TestApp) -> (f64, f64) {
    app.origin()
}

async fn stored(app: &TestApp, source: &Source, id: &str) -> (Uuid, String, bool, f64) {
    sqlx::query_as(
        "SELECT id, label, is_active, ST_X(location::geometry) FROM rallying_point WHERE source_key = $1",
    )
    .bind(format!("{}:{id}", source.name))
    .fetch_one(&app.db)
    .await
    .expect("point")
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn regeneration_updates_points_by_key_without_breaking_lianes() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let source = Source::new(&app);
    let other = Source::new(&app);
    let label = |name: &str| format!("{name} {}", &source.name[4..12]);

    let report = sync(
        &app.db,
        &[&other.name],
        vec![other.point("x", "Ailleurs", 9)],
    )
    .await
    .unwrap();
    assert_eq!(report.inserted, 1);

    let first = vec![
        source.point("a", &label("Alpha"), 0),
        source.point("b", &label("Bravo"), 1),
        source.point("c", &label("Charlie"), 2),
    ];
    let report = sync(&app.db, &[&source.name], first.clone()).await.unwrap();
    assert_eq!(
        report,
        SyncReport {
            count: 3,
            inserted: 3,
            ..SyncReport::default()
        }
    );
    let (a_id, _, _, a_lng) = stored(&app, &source, "a").await;
    let (b_id, ..) = stored(&app, &source, "b").await;

    let unchanged = sync(&app.db, &[&source.name], first).await.unwrap();
    assert_eq!(
        unchanged,
        SyncReport {
            count: 3,
            ..SyncReport::default()
        }
    );

    // Une liane, un membre, un trajet et une demande de trajet s'appuient sur Alpha et Bravo.
    let a = Point {
        id: a_id,
        lat: source.lat,
        lng: a_lng,
    };
    let b = Point {
        id: b_id,
        lat: source.lat,
        lng: a_lng + 0.1,
    };
    let liane = app
        .create_liane(&admin, &unique_name("Clé stable"), &[&a, &b])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let (member, _) = app.new_member("Mila", liane_id, &a, &b).await;
    let departure = (chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339();
    let (status, trip) = app
        .post(
            &format!("/liane/{liane_id}/trip"),
            Some(&member),
            json!({ "departure_time": departure, "direction": "Outbound", "seat_count": 2 }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{trip}");
    let (status, request) = app
        .post(
            "/liane_request",
            Some(&member),
            json!({ "name": "Travail", "waypoints": [a_id, b_id], "round_trip": false,
                    "arrive_before": "08:30:00", "return_after": "17:30:00", "can_drive": true, "week_days": "1111100" }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{request}");

    // La source change : Alpha est renommé et déplacé, Bravo disparaît, Delta apparaît.
    let mut alpha = source.point("a", &label("Alpha-le-Neuf"), 0);
    alpha.lng += 0.001;
    let second = vec![
        alpha,
        source.point("c", &label("Charlie"), 2),
        source.point("d", &label("Delta"), 3),
    ];
    let report = sync(&app.db, &[&source.name], second.clone())
        .await
        .unwrap();
    assert_eq!(
        report,
        SyncReport {
            count: 3,
            inserted: 1,
            updated: 1,
            deactivated: 1,
            deactivated_in_use: 1,
            ..SyncReport::default()
        }
    );

    let (a_after, a_label, a_active, a_lng_after) = stored(&app, &source, "a").await;
    assert_eq!(a_after, a_id, "l'identifiant ne change pas");
    assert_eq!(a_label, label("Alpha-le-Neuf"));
    assert!(a_active);
    assert!((a_lng_after - a_lng - 0.001).abs() < 1e-9);
    let (b_after, _, b_active, _) = stored(&app, &source, "b").await;
    assert_eq!(b_after, b_id);
    assert!(!b_active, "un point disparu est désactivé, pas supprimé");
    let (_, _, other_active, _) = stored(&app, &other, "x").await;
    assert!(other_active, "une autre source n'est pas touchée");

    // Le point désactivé n'est plus proposé, mais la liane, le trajet et la demande tiennent toujours.
    let (_, found) = app
        .get(
            &format!(
                "/rallying_point?search={}&lat={}&lng={}",
                &source.name[4..12],
                source.lat,
                source.lng
            ),
            None,
        )
        .await;
    let found: Vec<&str> = found
        .as_array()
        .unwrap()
        .iter()
        .map(|p| p["id"].as_str().unwrap())
        .collect();
    assert!(found.contains(&a_id.to_string().as_str()));
    assert!(!found.contains(&b_id.to_string().as_str()));

    let slug = liane["slug"].as_str().unwrap();
    let (status, detail) = app.get(&format!("/liane/{slug}"), Some(&member)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(detail["stops"][0]["label"], label("Alpha-le-Neuf"));
    assert_eq!(detail["stops"][1]["id"], b_id.to_string());
    assert_eq!(detail["stops"][1]["is_active"], false);
    let (status, _) = app
        .get(
            &format!("/trip/{}", trip["id"].as_str().unwrap()),
            Some(&member),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    let (status, kept_request) = app
        .get(
            &format!("/liane_request/{}", request["id"].as_str().unwrap()),
            Some(&member),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(kept_request["waypoints"].as_array().unwrap().len(), 2);
    let (status, _) = app
        .put(
            &format!("/liane/{liane_id}/membership"),
            Some(&member),
            membership(&a, &b, "1010100", "Both", false),
        )
        .await;
    assert_eq!(status, StatusCode::OK);

    // On peut encore modifier la liane en gardant son arrêt désactivé, pas en créer une nouvelle dessus.
    let (status, renamed) = app
        .put(
            &format!("/liane/{liane_id}"),
            Some(&admin),
            json!({ "name": "Clé stable renommée", "stop_ids": [a_id, b_id] }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{renamed}");
    let (status, _) = app
        .post(
            "/liane",
            Some(&admin),
            json!({ "name": "Refusée", "stop_ids": [a_id, b_id] }),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Bravo revient dans la source : il est réactivé sous le même identifiant.
    let mut third = second;
    third.push(source.point("b", &label("Bravo"), 1));
    let report = sync(&app.db, &[&source.name], third).await.unwrap();
    assert_eq!(
        report,
        SyncReport {
            count: 4,
            reactivated: 1,
            ..SyncReport::default()
        }
    );
    let (b_back, _, b_active, _) = stored(&app, &source, "b").await;
    assert_eq!(b_back, b_id);
    assert!(b_active);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn points_generated_before_the_key_get_it_back_and_keep_their_id() {
    let app = TestApp::spawn().await;
    let source = Source::new(&app);
    let label = format!("Mairie d'Avant {}", &source.name[4..12]);
    let legacy = app.point_at(&label, source.lat, source.lng).await;
    sqlx::query("UPDATE rallying_point SET kind = 'TownHall' WHERE id = $1")
        .bind(legacy.id)
        .execute(&app.db)
        .await
        .unwrap();

    let mut point = source.point("a", &label, 0);
    point.lat = legacy.lat;
    point.lng = legacy.lng;
    let report = sync(&app.db, &[&source.name], vec![point.clone()])
        .await
        .unwrap();
    assert_eq!(report.adopted, 1);
    assert_eq!(report.inserted, 0);
    let (id, ..) = stored(&app, &source, "a").await;
    assert_eq!(id, legacy.id);

    let again = sync(&app.db, &[&source.name], vec![point]).await.unwrap();
    assert_eq!((again.adopted, again.inserted, again.updated), (0, 0, 0));
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn the_sql_uuidv7_function_works_without_pgcrypto() {
    let app = TestApp::spawn().await;
    let (first, second): (Uuid, Uuid) = sqlx::query_as(
        "SELECT a, b FROM (SELECT public.uuidv7() AS a) x, LATERAL (SELECT pg_sleep(0.002), public.uuidv7() AS b) y",
    )
    .fetch_one(&app.db)
    .await
    .unwrap();
    assert_eq!(first.get_version_num(), 7);
    assert_eq!(second.get_version_num(), 7);
    assert!(first < second, "les identifiants suivent l'heure");
    let millis = u64::from_be_bytes(first.as_bytes()[..8].try_into().unwrap()) >> 16;
    let now = chrono::Utc::now().timestamp_millis() as u64;
    assert!(now.abs_diff(millis) < 60_000);
}
