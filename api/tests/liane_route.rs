//! Tracé routier des lianes : repli en ligne droite sans OSRM, tracé OSRM (faux serveur local),
//! et OSRM réel si `TEST_OSRM_URL` est fourni. Exigent `TEST_DATABASE_URL`.

mod common;

use std::env::var;
use std::time::{Duration, Instant};

use common::{FakeOsrm, TestApp, fake_osrm, tile_of, unique_name};
use reqwest::StatusCode;
use serde_json::{Value, json};

fn coordinate_count(liane: &Value) -> usize {
    liane["route"]["coordinates"].as_array().unwrap().len()
}

fn assert_straight(liane: &Value, stop_count: usize) {
    assert_eq!(liane["route_source"], "Straight", "{liane}");
    assert_eq!(coordinate_count(liane), stop_count);
    assert!(liane["duration_seconds"].is_null());
    let distances = liane["stop_distances"].as_array().unwrap();
    assert_eq!(distances.len(), stop_count);
    assert_eq!(distances[0], 0);
    assert_eq!(distances[stop_count - 1], liane["distance_meters"]);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn without_osrm_a_liane_is_created_with_a_straight_route() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(3).await;
    let (a, b, c) = (&points[0], &points[1], &points[2]);

    let liane = app
        .create_liane(&admin, &unique_name("Sans OSRM"), &[a, b, c])
        .await;
    assert_straight(&liane, 3);
    // Les points de test sont espacés de 0,1° de longitude : au plus 11,2 km par tronçon.
    let total = liane["distance_meters"].as_i64().unwrap();
    assert!((5_000..=22_400).contains(&total), "{total}");
    let middle = liane["stop_distances"][1].as_i64().unwrap();
    assert!((middle * 2 - total).abs() <= 2);

    let (status, preview) = app
        .post(
            "/liane/route_preview",
            Some(&admin),
            json!({ "stop_ids": [a.id, b.id] }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{preview}");
    assert_eq!(preview["route_source"], "Straight");
    assert_eq!(preview["route"]["type"], "LineString");
    assert_eq!(preview["distance_meters"], liane["stop_distances"][1]);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn an_unreachable_or_failing_osrm_never_prevents_creation() {
    let unreachable = "http://127.0.0.1:1".to_string();
    let not_a_url = "pas une url".to_string();
    let no_route = fake_osrm(FakeOsrm::NoRoute).await;
    let broken = fake_osrm(FakeOsrm::BrokenGateway).await;

    for osrm_url in [unreachable, not_a_url, no_route, broken] {
        let app = TestApp::spawn_with_osrm(&osrm_url).await;
        let admin = app.admin_token().await;
        let points = app.points(2).await;
        let liane = app
            .create_liane(&admin, &unique_name("Repli"), &[&points[0], &points[1]])
            .await;
        assert_straight(&liane, 2);
    }
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_slow_osrm_is_abandoned_after_a_few_seconds() {
    let app = TestApp::spawn_with_osrm(&fake_osrm(FakeOsrm::TooSlow).await).await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;

    let started = Instant::now();
    let liane = app
        .create_liane(&admin, &unique_name("Lent"), &[&points[0], &points[1]])
        .await;
    assert_straight(&liane, 2);
    assert!(started.elapsed() < Duration::from_secs(7));
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn the_osrm_route_is_stored_previewed_and_recomputed_when_stops_change() {
    let app = TestApp::spawn_with_osrm(&fake_osrm(FakeOsrm::Route).await).await;
    let admin = app.admin_token().await;
    let points = app.points(4).await;
    let (a, b, c, d) = (&points[0], &points[1], &points[2], &points[3]);

    let (status, preview) = app
        .post(
            "/liane/route_preview",
            Some(&admin),
            json!({ "stop_ids": [a.id, b.id, c.id] }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{preview}");
    assert_eq!(preview["route_source"], "Osrm");
    assert_eq!(preview["route"]["coordinates"].as_array().unwrap().len(), 5);
    assert_eq!(preview["distance_meters"], 2000);
    assert_eq!(preview["duration_seconds"], 120);
    assert_eq!(preview["stop_distances"], json!([0, 1000, 2000]));

    let (user, _) = app.new_user("Ursule").await;
    let body = json!({ "stop_ids": [a.id, b.id] });
    let (status, _) = app
        .post("/liane/route_preview", Some(&user), body.clone())
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.post("/liane/route_preview", None, body).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = app
        .post(
            "/liane/route_preview",
            Some(&admin),
            json!({ "stop_ids": [a.id] }),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let name = unique_name("Routier");
    let liane = app.create_liane(&admin, &name, &[a, b, c]).await;
    let id = liane["id"].as_str().unwrap();
    let slug = liane["slug"].as_str().unwrap();
    assert_eq!(liane["route_source"], "Osrm");
    assert_eq!(coordinate_count(&liane), 5);
    assert_eq!(liane["distance_meters"], 2000);
    assert_eq!(liane["duration_seconds"], 120);
    assert_eq!(liane["stop_distances"], json!([0, 1000, 2000]));

    let (_, detail) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(detail["route_source"], "Osrm");
    assert_eq!(detail["distance_meters"], 2000);
    assert_eq!(detail["stop_distances"], json!([0, 1000, 2000]));

    let (status, updated) = app
        .put(
            &format!("/liane/{id}"),
            Some(&admin),
            json!({ "name": name, "stop_ids": [a.id, b.id, c.id, d.id] }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    assert_eq!(coordinate_count(&updated), 7);
    assert_eq!(updated["distance_meters"], 3000);
    assert_eq!(updated["stop_distances"], json!([0, 1000, 2000, 3000]));
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn an_admin_recomputes_straight_routes_once_osrm_answers() {
    let without_osrm = TestApp::spawn().await;
    let admin = without_osrm.admin_token().await;
    let points = without_osrm.points(3).await;
    let (a, b, c) = (&points[0], &points[1], &points[2]);
    let first = without_osrm
        .create_liane(&admin, &unique_name("Recalcul"), &[a, b, c])
        .await;
    let second = without_osrm
        .create_liane(&admin, &unique_name("Recalcul"), &[c, a])
        .await;
    assert_straight(&first, 3);
    let first_route = format!("/liane/{}/route", first["id"].as_str().unwrap());

    let (status, still_straight) = without_osrm
        .post(&first_route, Some(&admin), json!({}))
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_straight(&still_straight, 3);

    let unreachable = TestApp::spawn_with_osrm("http://127.0.0.1:1").await;
    let (status, report) = unreachable
        .post("/liane/admin/recompute_routes", Some(&admin), json!({}))
        .await;
    assert_eq!(status, StatusCode::OK, "{report}");
    assert_eq!(report["recomputed"], 0);
    assert!(report["still_straight"].as_i64().unwrap() >= 2);

    let with_osrm = TestApp::spawn_with_osrm(&fake_osrm(FakeOsrm::Route).await).await;
    let (user, _) = with_osrm.new_user("Ursule").await;
    let (status, _) = with_osrm.post(&first_route, Some(&user), json!({})).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = with_osrm
        .post("/liane/admin/recompute_routes", Some(&user), json!({}))
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let (status, recomputed) = with_osrm.post(&first_route, Some(&admin), json!({})).await;
    assert_eq!(status, StatusCode::OK, "{recomputed}");
    assert_eq!(recomputed["route_source"], "Osrm");
    assert_eq!(coordinate_count(&recomputed), 5);
    assert_eq!(recomputed["stop_distances"], json!([0, 1000, 2000]));

    let (status, report) = with_osrm
        .post("/liane/admin/recompute_routes", Some(&admin), json!({}))
        .await;
    assert_eq!(status, StatusCode::OK, "{report}");
    assert!(report["recomputed"].as_i64().unwrap() >= 1);

    let (_, second) = with_osrm
        .get(
            &format!("/liane/{}", second["slug"].as_str().unwrap()),
            None,
        )
        .await;
    assert_eq!(second["route_source"], "Osrm");
    assert_eq!(second["stop_distances"], json!([0, 1000]));

    let (status, _) = with_osrm
        .post(
            &format!("/liane/{}/route", uuid::Uuid::now_v7()),
            Some(&admin),
            json!({}),
        )
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Contre un vrai serveur OSRM couvrant la Lozère : `TEST_OSRM_URL=http://liane-osrm:5000`.
#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL et TEST_OSRM_URL"]
async fn real_osrm_routes_florac_to_mende_by_road() {
    let Ok(osrm_url) = var("TEST_OSRM_URL") else {
        eprintln!("TEST_OSRM_URL absent : test OSRM réel non joué");
        return;
    };
    let app = TestApp::spawn_with_osrm(&osrm_url).await;
    let admin = app.admin_token().await;
    let florac = app.point_at("Florac (test OSRM)", 44.3256, 3.5933).await;
    let balsieges = app.point_at("Balsièges (test OSRM)", 44.4817, 3.4567).await;
    let mende = app.point_at("Mende (test OSRM)", 44.5180, 3.4990).await;
    let paris = app.point_at("Paris (test OSRM)", 48.8566, 2.3522).await;

    let started = Instant::now();
    let liane = app
        .create_liane(&admin, &unique_name("Florac Mende"), &[&florac, &mende])
        .await;
    let elapsed = started.elapsed();

    assert_eq!(liane["route_source"], "Osrm", "{liane}");
    let distance = liane["distance_meters"].as_i64().unwrap();
    let duration = liane["duration_seconds"].as_i64().unwrap();
    assert!((33_000..=40_000).contains(&distance), "{distance} m");
    assert!((25 * 60..=50 * 60).contains(&duration), "{duration} s");
    assert!(coordinate_count(&liane) > 100);
    assert_eq!(liane["stop_distances"], json!([0, distance]));

    let (x, y) = tile_of(&mende, 9);
    let (points, stored_bytes, geojson_bytes, tile_bytes): (i32, i32, i32, i32) = sqlx::query_as(
        r#"
            SELECT
                ST_NPoints(route),
                ST_MemSize(route),
                length(ST_AsGeoJSON(route, 5)),
                COALESCE(length(liane_display(9, $2, $3)), 0)
            FROM liane
            WHERE id = $1::uuid
        "#,
    )
    .bind(liane["id"].as_str().unwrap())
    .bind(x)
    .bind(y)
    .fetch_one(&app.db)
    .await
    .unwrap();
    assert!(tile_bytes > 0);
    eprintln!(
        "Florac – Mende : {distance} m, {duration} s, {points} points, {stored_bytes} octets en base, \
         {geojson_bytes} octets en GeoJSON, tuile z9 de la base de test {tile_bytes} octets, création en {elapsed:?}"
    );

    let via = app
        .create_liane(
            &admin,
            &unique_name("Florac Balsièges Mende"),
            &[&florac, &balsieges, &mende],
        )
        .await;
    assert_eq!(via["route_source"], "Osrm", "{via}");
    let cumulative: Vec<i64> = via["stop_distances"]
        .as_array()
        .unwrap()
        .iter()
        .map(|distance| distance.as_i64().unwrap())
        .collect();
    assert_eq!(cumulative[0], 0);
    assert!(cumulative[1] > 20_000 && cumulative[1] < cumulative[2]);
    assert!((cumulative[2] - via["distance_meters"].as_i64().unwrap()).abs() <= 2);

    // Paris est hors des données routières (Occitanie) : repli, sans échec.
    let outside = app
        .create_liane(&admin, &unique_name("Florac Paris"), &[&florac, &paris])
        .await;
    assert_straight(&outside, 2);
}
