//! Régénération des points de ralliement par clé stable, création et modification par un administrateur.
//! Ignorés par défaut : ils exigent `TEST_DATABASE_URL`.

mod common;

use api::rallying_point::generate::{SourcePoint, SyncReport, sync};
use api::rallying_point::model::RallyingPointKind;
use common::{FakeOsrm, Point, TestApp, fake_osrm, membership, tile_of, unique_name};
use reqwest::StatusCode;
use serde_json::{Value, json};
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

fn point_body(label: &str, lat: f64, lng: f64) -> Value {
    json!({
        "label": label, "lat": lat, "lng": lng, "kind": "Parking", "address": "1 rue du Test",
        "zip_code": "48000", "city": "Testville", "place_count": 12,
    })
}

fn token() -> String {
    format!("Manuel{}", &Uuid::new_v4().simple().to_string()[..10])
}

async fn tile_shows(app: &TestApp, point: &Point, label: &str) -> bool {
    let (x, y) = tile_of(point, 10);
    let tile: Option<Vec<u8>> = sqlx::query_scalar("SELECT rallying_point_display(10, $1, $2)")
        .bind(x)
        .bind(y)
        .fetch_one(&app.db)
        .await
        .unwrap();
    String::from_utf8_lossy(&tile.unwrap_or_default()).contains(label)
}

fn ids(list: &Value) -> Vec<&str> {
    list.as_array()
        .unwrap()
        .iter()
        .map(|point| point["id"].as_str().unwrap())
        .collect()
}

/// Le tracé passe-t-il par ce point, à la précision des coordonnées servies ?
fn passes_by(liane: &Value, lat: f64, lng: f64) -> bool {
    liane["route"]["coordinates"]
        .as_array()
        .unwrap()
        .iter()
        .any(|c| {
            (c[0].as_f64().unwrap() - lng).abs() < 1e-4
                && (c[1].as_f64().unwrap() - lat).abs() < 1e-4
        })
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn an_admin_creates_and_edits_a_point() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let (user, _) = app.new_user("Uma").await;
    let (lat, lng) = app.origin();
    let label = token();
    let body = point_body(&format!("  {label}  "), lat, lng);

    let (status, _) = app.post("/rallying_point", None, body.clone()).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = app.post("/rallying_point", Some(&user), body.clone()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let (status, created) = app.post("/rallying_point", Some(&admin), body).await;
    assert_eq!(status, StatusCode::OK, "{created}");
    let id = created["id"].as_str().unwrap();
    assert_eq!(created["label"], label);
    assert_eq!(created["kind"], "Parking");
    assert_eq!(created["city"], "Testville");
    assert_eq!(created["place_count"], 12);
    assert_eq!(created["is_active"], true);
    assert!(created["source"].is_null());
    assert!(created["edited_at"].is_string());
    assert_eq!(created["lianes"], json!([]));
    let point = Point {
        id: id.parse().unwrap(),
        lat,
        lng,
    };

    // Le point est proposé tout de suite : recherche publique et tuiles.
    let public = format!("/rallying_point?search={label}&lat={lat}&lng={lng}");
    let (_, found) = app.get(&public, None).await;
    assert_eq!(ids(&found), [id]);
    assert!(tile_shows(&app, &point, &label).await);

    for path in [
        format!("/rallying_point/{id}"),
        format!("/rallying_point/admin?search={label}"),
    ] {
        let (status, _) = app.get(&path, None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        let (status, _) = app.get(&path, Some(&user)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }
    let (status, _) = app
        .put(
            &format!("/rallying_point/{id}"),
            Some(&user),
            point_body(&label, lat, lng),
        )
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let renamed = format!("{label} bis");
    let mut body = point_body(&renamed, lat, lng);
    body["kind"] = json!("CarpoolArea");
    body["place_count"] = Value::Null;
    body["is_active"] = json!(false);
    let (status, updated) = app
        .put(&format!("/rallying_point/{id}"), Some(&admin), body)
        .await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    assert_eq!(updated["label"], renamed);
    assert_eq!(updated["kind"], "CarpoolArea");
    assert!(updated["place_count"].is_null());
    assert_eq!(updated["is_active"], false);
    let (status, read) = app
        .get(&format!("/rallying_point/{id}"), Some(&admin))
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(read, updated);

    // Désactivé : absent de la recherche publique et des tuiles, toujours visible de l'administration.
    let (_, found) = app.get(&public, None).await;
    assert!(ids(&found).is_empty());
    assert!(!tile_shows(&app, &point, &label).await);
    let (status, found) = app
        .get(
            &format!("/rallying_point/admin?search={label}"),
            Some(&admin),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(ids(&found), [id]);
    assert_eq!(found[0]["is_active"], false);

    let (status, _) = app
        .put(
            &format!("/rallying_point/{}", Uuid::new_v4()),
            Some(&admin),
            point_body(&label, lat, lng),
        )
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn the_admin_search_sorts_by_distance_and_tells_where_points_come_from() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let source = Source::new(&app);
    let label = token();
    sync(
        &app.db,
        &[&source.name],
        vec![source.point("a", &format!("{label} source"), 0)],
    )
    .await
    .unwrap();
    let (status, near) = app
        .post(
            "/rallying_point",
            Some(&admin),
            point_body(&format!("{label} main"), source.lat, source.lng + 0.3),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{near}");

    let (_, found) = app
        .get(
            &format!(
                "/rallying_point/admin?search={label}&lat={}&lng={}",
                source.lat,
                source.lng + 0.3
            ),
            Some(&admin),
        )
        .await;
    assert_eq!(found.as_array().unwrap().len(), 2, "{found}");
    assert_eq!(found[0]["id"], near["id"]);
    assert!(found[0]["source"].is_null());
    assert_eq!(found[1]["source"], source.name);
    assert!(found[1]["edited_at"].is_null());

    let (_, limited) = app
        .get(
            &format!("/rallying_point/admin?search={label}&limit=1"),
            Some(&admin),
        )
        .await;
    assert_eq!(limited.as_array().unwrap().len(), 1);
    assert_eq!(limited[0]["id"], near["id"], "sans position : par libellé");
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn invalid_points_are_refused_with_the_reason() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let (lat, lng) = app.origin();
    let label = token();
    let (_, created) = app
        .post(
            "/rallying_point",
            Some(&admin),
            point_body(&label, lat, lng),
        )
        .await;
    let path = format!("/rallying_point/{}", created["id"].as_str().unwrap());

    let cases = [
        ("label", json!("   "), "InvalidLabel"),
        ("label", json!("x".repeat(256)), "InvalidLabel"),
        ("lat", json!(90.5), "InvalidPosition"),
        ("lng", json!(-181), "InvalidPosition"),
        ("kind", json!("Gare"), "InvalidKind"),
        ("zip_code", json!("480000000000"), "InvalidZipCode"),
        ("city", json!("x".repeat(101)), "InvalidCity"),
        ("place_count", json!(-1), "InvalidPlaceCount"),
    ];
    for (field, value, keyword) in cases {
        let mut body = point_body(&label, lat, lng);
        body[field] = value;
        let (status, reason) = app
            .post("/rallying_point", Some(&admin), body.clone())
            .await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{field}");
        assert_eq!(reason, keyword);
        let (status, reason) = app.put(&path, Some(&admin), body).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{field}");
        assert_eq!(reason, keyword);
    }

    let (_, read) = app.get(&path, Some(&admin)).await;
    assert_eq!(read, created, "un refus ne change rien");
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn moving_a_stop_recomputes_the_route_of_its_lianes() {
    let app = TestApp::spawn_with_osrm(&fake_osrm(FakeOsrm::Route).await).await;
    let admin = app.admin_token().await;
    let points = app.points(4).await;
    let (a, b, c, d) = (&points[0], &points[1], &points[2], &points[3]);
    let through = app
        .create_liane(&admin, &unique_name("Passe"), &[a, b, c])
        .await;
    let from = app
        .create_liane(&admin, &unique_name("Part"), &[b, d])
        .await;
    let moved_lat = b.lat + 0.05;
    assert!(!passes_by(&through, moved_lat, b.lng));

    let mut body = point_body("Arrêt déplacé", moved_lat, b.lng);
    body["kind"] = json!("TownHall");
    let (status, moved) = app
        .put(&format!("/rallying_point/{}", b.id), Some(&admin), body)
        .await;
    assert_eq!(status, StatusCode::OK, "{moved}");
    assert_eq!(moved["lianes"].as_array().unwrap().len(), 2);

    for liane in [&through, &from] {
        let slug = liane["slug"].as_str().unwrap();
        let (_, after) = app.get(&format!("/liane/{slug}"), None).await;
        assert_eq!(after["route_source"], "Osrm");
        assert!(passes_by(&after, moved_lat, b.lng), "{after}");
        assert!(!passes_by(&after, b.lat, b.lng), "{after}");
        assert_ne!(after["updated_at"], liane["updated_at"]);
    }

    // Sans déplacement, les tracés ne sont pas recalculés.
    let slug = through["slug"].as_str().unwrap();
    let (_, before) = app.get(&format!("/liane/{slug}"), None).await;
    let mut body = point_body("Arrêt renommé", moved_lat, b.lng);
    body["kind"] = json!("TownHall");
    let (status, _) = app
        .put(&format!("/rallying_point/{}", b.id), Some(&admin), body)
        .await;
    assert_eq!(status, StatusCode::OK);
    let (_, after) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(after["updated_at"], before["updated_at"]);
    assert_eq!(after["stops"][1]["label"], "Arrêt renommé");
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn moving_a_stop_without_osrm_falls_back_to_a_straight_route() {
    let app = TestApp::spawn_with_osrm("http://127.0.0.1:1").await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app
        .create_liane(&admin, &unique_name("Repli"), &[a, b])
        .await;

    let mut body = point_body("Arrêt déplacé", b.lat, b.lng + 0.1);
    body["kind"] = json!("TownHall");
    let (status, moved) = app
        .put(&format!("/rallying_point/{}", b.id), Some(&admin), body)
        .await;
    assert_eq!(status, StatusCode::OK, "{moved}");

    let slug = liane["slug"].as_str().unwrap();
    let (_, after) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(after["route_source"], "Straight");
    assert!(passes_by(&after, b.lat, b.lng + 0.1), "{after}");
    let (before, now) = (
        liane["distance_meters"].as_i64().unwrap(),
        after["distance_meters"].as_i64().unwrap(),
    );
    assert!(now > before * 3 / 2, "{before} -> {now}");
    assert_eq!(after["stop_distances"][1], after["distance_meters"]);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_stop_of_a_liane_cannot_be_deactivated() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(3).await;
    let (a, b, free) = (&points[0], &points[1], &points[2]);
    let name = unique_name("Tenue");
    app.create_liane(&admin, &name, &[a, b]).await;

    let mut body = point_body("Arrêt tenu", a.lat, a.lng);
    body["is_active"] = json!(false);
    let path = format!("/rallying_point/{}", a.id);
    let (status, reason) = app.put(&path, Some(&admin), body.clone()).await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(reason, format!("StopOfLianes: {name}"));
    let (_, read) = app.get(&path, Some(&admin)).await;
    assert_eq!(read["is_active"], true);
    assert_eq!(read["label"], "Arrêt 0", "le refus ne change rien");
    assert_eq!(read["lianes"], json!([name]));
    assert!(read["edited_at"].is_null());

    let (status, _) = app
        .put(&format!("/rallying_point/{}", free.id), Some(&admin), body)
        .await;
    assert_eq!(status, StatusCode::OK, "un point sans liane se désactive");
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn regeneration_leaves_hand_edited_points_alone() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let source = Source::new(&app);
    let label = |name: &str| format!("{name} {}", &source.name[4..12]);
    let first = vec![
        source.point("a", &label("Alpha"), 0),
        source.point("b", &label("Bravo"), 1),
        source.point("c", &label("Charlie"), 2),
        source.point("d", &label("Delta"), 3),
    ];
    sync(&app.db, &[&source.name], first).await.unwrap();
    let (a_id, ..) = stored(&app, &source, "a").await;
    let (b_id, ..) = stored(&app, &source, "b").await;
    let (d_id, ..) = stored(&app, &source, "d").await;

    // À la main : Alpha renommé et déplacé, Bravo désactivé, Delta renommé.
    let put = async |id: Uuid, body: Value| {
        let (status, point) = app
            .put(&format!("/rallying_point/{id}"), Some(&admin), body)
            .await;
        assert_eq!(status, StatusCode::OK, "{point}");
        assert_eq!(point["source"], source.name);
        assert!(point["edited_at"].is_string());
    };
    put(
        a_id,
        point_body(&label("Alpha manuel"), source.lat + 0.01, source.lng),
    )
    .await;
    let mut off = point_body(&label("Bravo"), source.lat, source.lng + 0.1);
    off["is_active"] = json!(false);
    put(b_id, off).await;
    put(
        d_id,
        point_body(&label("Delta manuel"), source.lat, source.lng + 0.3),
    )
    .await;

    // La source renomme Alpha, garde Bravo, perd Charlie et Delta.
    let second = vec![
        source.point("a", &label("Alpha-le-Neuf"), 0),
        source.point("b", &label("Bravo"), 1),
    ];
    let report = sync(&app.db, &[&source.name], second).await.unwrap();
    assert_eq!(
        report,
        SyncReport {
            count: 2,
            deactivated: 1,
            ..SyncReport::default()
        }
    );

    let (a_after, a_label, a_active, _) = stored(&app, &source, "a").await;
    assert_eq!(a_after, a_id);
    assert_eq!(a_label, label("Alpha manuel"));
    assert!(a_active);
    let a_lat: f64 =
        sqlx::query_scalar("SELECT ST_Y(location::geometry) FROM rallying_point WHERE id = $1")
            .bind(a_id)
            .fetch_one(&app.db)
            .await
            .unwrap();
    assert!((a_lat - source.lat - 0.01).abs() < 1e-9);
    let (_, _, b_active, _) = stored(&app, &source, "b").await;
    assert!(!b_active, "un point désactivé à la main le reste");
    let (_, _, c_active, _) = stored(&app, &source, "c").await;
    assert!(!c_active, "un point jamais modifié suit sa source");
    let (_, d_label, d_active, _) = stored(&app, &source, "d").await;
    assert!(d_active, "un point modifié à la main n'est pas désactivé");
    assert_eq!(d_label, label("Delta manuel"));
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn regeneration_does_not_adopt_a_hand_made_point() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let source = Source::new(&app);
    let label = token();
    let mut body = point_body(&label, source.lat, source.lng);
    body["kind"] = json!("TownHall");
    let (status, made) = app.post("/rallying_point", Some(&admin), body).await;
    assert_eq!(status, StatusCode::OK, "{made}");

    // La source donne ensuite un point de même libellé, de même type, au même endroit.
    let report = sync(&app.db, &[&source.name], vec![source.point("a", &label, 0)])
        .await
        .unwrap();
    assert_eq!((report.adopted, report.inserted), (0, 1));
    let (from_source, ..) = stored(&app, &source, "a").await;
    assert_ne!(from_source.to_string(), made["id"].as_str().unwrap());

    let (_, read) = app
        .get(
            &format!("/rallying_point/{}", made["id"].as_str().unwrap()),
            Some(&admin),
        )
        .await;
    assert!(read["source"].is_null());
    assert_eq!(read["is_active"], true);

    let emptied = sync(&app.db, &[&source.name], vec![]).await.unwrap();
    assert_eq!(emptied.deactivated, 1);
    let (_, read) = app
        .get(
            &format!("/rallying_point/{}", made["id"].as_str().unwrap()),
            Some(&admin),
        )
        .await;
    assert_eq!(read["is_active"], true);
}
