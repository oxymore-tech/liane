//! Tests d'intégration du porte-monnaie et du relevé mensuel, contre une vraie base PostgreSQL + PostGIS.
//! Ignorés par défaut : ils exigent `TEST_DATABASE_URL`.

mod common;

use api::fr_time::paris_month;
use chrono::{DateTime, Duration, Months, Utc};
use common::{Point, TEST_COST_SHARE_CENTS_PER_KM, TestApp, unique_name};
use reqwest::StatusCode;
use serde_json::{Value, json};

const WALLET: &str = "/wallet";

struct Ride {
    trip_id: String,
    departure_time: DateTime<Utc>,
}

async fn propose(app: &TestApp, liane_id: &str, driver: &str) -> Ride {
    let departure_time = Utc::now() + Duration::minutes(10);
    let (status, trip) = app
        .post(
            &format!("/liane/{liane_id}/trip"),
            Some(driver),
            json!({ "departure_time": departure_time.to_rfc3339(), "direction": "Outbound", "seat_count": 3 }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{trip}");
    Ride {
        trip_id: trip["id"].as_str().expect("id du trajet").to_string(),
        departure_time,
    }
}

async fn book(app: &TestApp, ride: &Ride, passenger: &str) {
    let (status, body) = app
        .post(
            &format!("/trip/{}/passenger", ride.trip_id),
            Some(passenger),
            json!({}),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{body}");
}

async fn declare(app: &TestApp, ride: &Ride, token: &str, kind: &str, point: &Point) {
    let (status, body) = app
        .post(
            &format!("/trip/{}/gesture", ride.trip_id),
            Some(token),
            json!({ "kind": kind, "position": { "lat": point.lat, "lng": point.lng } }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{body}");
}

async fn open_wallet(app: &TestApp, token: &str) -> Value {
    let (status, wallet) = app.put(WALLET, Some(token), json!({})).await;
    assert_eq!(status, StatusCode::OK, "{wallet}");
    wallet
}

async fn statement_of(app: &TestApp, token: &str, month: &str) -> Value {
    let (status, statement) = app
        .get(&format!("{WALLET}/statement/{month}"), Some(token))
        .await;
    assert_eq!(status, StatusCode::OK, "{statement}");
    statement
}

fn month_of(ride: &Ride) -> String {
    paris_month(ride.departure_time).format("%Y-%m").to_string()
}

fn expected_cents(distance_meters: i64) -> i64 {
    (distance_meters * i64::from(TEST_COST_SHARE_CENTS_PER_KM) + 500) / 1000
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_wallet_is_optional_and_only_its_holder_opens_or_closes_it() {
    let app = TestApp::spawn().await;
    let (user, _) = app.new_user("Wanda").await;

    let (status, _) = app.get(WALLET, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = app.put(WALLET, None, json!({})).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let (status, wallet) = app.get(WALLET, Some(&user)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        wallet,
        json!({ "kind": "Closed", "cents_per_km": TEST_COST_SHARE_CENTS_PER_KM })
    );

    let opened = open_wallet(&app, &user).await;
    assert_eq!(opened["kind"], "Open");
    assert_eq!(opened["cents_per_km"], TEST_COST_SHARE_CENTS_PER_KM);
    assert_eq!(open_wallet(&app, &user).await, opened);
    assert_eq!(app.get(WALLET, Some(&user)).await.1, opened);

    let (status, closed) = app.delete(WALLET, Some(&user)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(closed["kind"], "Closed");
    assert_eq!(app.get(WALLET, Some(&user)).await.1["kind"], "Closed");
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn without_a_rate_nobody_has_a_wallet_and_no_share_is_recorded() {
    let app = TestApp::spawn_without_cost_share().await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app
        .create_liane(&admin, &unique_name("Sans tarif"), &[a, b])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let (driver, _) = app.new_member("Denis", liane_id, a, b).await;
    let (paula, _) = app.new_member("Paula", liane_id, a, b).await;

    assert_eq!(
        app.get(WALLET, Some(&paula)).await.1,
        json!({ "kind": "Disabled" })
    );
    let (status, _) = app.put(WALLET, Some(&paula), json!({})).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, _) = app.delete(WALLET, Some(&paula)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    let ride = propose(&app, liane_id, &driver).await;
    book(&app, &ride, &paula).await;
    declare(&app, &ride, &driver, "Start", a).await;
    declare(&app, &ride, &paula, "Start", a).await;
    declare(&app, &ride, &paula, "End", b).await;
    declare(&app, &ride, &driver, "End", b).await;

    let statement = statement_of(&app, &paula, &month_of(&ride)).await;
    assert_eq!(statement["owed_cents"], 0);
    assert_eq!(statement["entries"], json!([]));
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_passenger_who_got_off_owes_the_rate_on_their_section_when_both_have_a_wallet() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(4).await;
    let (a, b, c, d) = (&points[0], &points[1], &points[2], &points[3]);
    let liane = app
        .create_liane(&admin, &unique_name("Partage"), &[a, b, c, d])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let distance_of = |index: usize| liane["stop_distances"][index].as_i64().unwrap();
    let paula_distance = distance_of(3) - distance_of(1);

    let (driver, driver_id) = app.new_member("Denis", liane_id, a, d).await;
    let (paula, paula_id) = app.new_member("Paula", liane_id, b, d).await;
    let (bob, _) = app.new_member("Bob", liane_id, a, c).await;
    open_wallet(&app, &driver).await;
    open_wallet(&app, &paula).await;

    let ride = propose(&app, liane_id, &driver).await;
    let month = month_of(&ride);
    book(&app, &ride, &paula).await;
    book(&app, &ride, &bob).await;

    let (_, seen_by_bob) = app
        .get(&format!("/trip/{}", ride.trip_id), Some(&bob))
        .await;
    assert_eq!(seen_by_bob["driver_has_wallet"], true);

    declare(&app, &ride, &driver, "Start", a).await;
    declare(&app, &ride, &paula, "Start", b).await;
    assert_eq!(
        statement_of(&app, &paula, &month).await["entries"],
        json!([])
    );
    declare(&app, &ride, &bob, "Start", a).await;
    declare(&app, &ride, &bob, "End", c).await;
    declare(&app, &ride, &paula, "End", d).await;
    declare(&app, &ride, &driver, "End", d).await;

    let owed = statement_of(&app, &paula, &month).await;
    let month_start = paris_month(ride.departure_time);
    assert_eq!(owed["month"], month_start.to_string());
    assert_eq!(
        owed["due_on"],
        (month_start + Months::new(1))
            .pred_opt()
            .unwrap()
            .to_string()
    );
    assert_eq!(owed["owed_cents"], expected_cents(paula_distance));
    assert_eq!(owed["received_cents"], 0);
    assert_eq!(owed["entries"].as_array().unwrap().len(), 1);
    let entry = &owed["entries"][0];
    assert_eq!(entry["trip_id"], ride.trip_id);
    assert_eq!(entry["role"], "Passenger");
    assert_eq!(entry["counterpart"]["id"], driver_id);
    assert_eq!(entry["counterpart"]["pseudo"], "Denis T.");
    assert_eq!(entry["from_stop"]["id"], b.id.to_string());
    assert_eq!(entry["to_stop"]["id"], d.id.to_string());
    assert_eq!(entry["distance_meters"], paula_distance);
    assert_eq!(entry["cents_per_km"], TEST_COST_SHARE_CENTS_PER_KM);
    assert_eq!(entry["amount_cents"], expected_cents(paula_distance));

    // Bob n'a pas de porte-monnaie : le conducteur ne reçoit que la part de Paula.
    let received = statement_of(&app, &driver, &month).await;
    assert_eq!(received["owed_cents"], 0);
    assert_eq!(received["received_cents"], expected_cents(paula_distance));
    assert_eq!(received["entries"].as_array().unwrap().len(), 1);
    assert_eq!(received["entries"][0]["role"], "Driver");
    assert_eq!(received["entries"][0]["counterpart"]["id"], paula_id);
    assert_eq!(statement_of(&app, &bob, &month).await["entries"], json!([]));

    let recorded: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM wallet_entry WHERE trip_id = $1::uuid")
            .bind(&ride.trip_id)
            .fetch_one(&app.db)
            .await
            .unwrap();
    assert_eq!(recorded, 1);

    // Fermer son porte-monnaie n'efface pas ce qui est déjà dû.
    let (status, _) = app.delete(WALLET, Some(&paula)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        statement_of(&app, &paula, &month).await["owed_cents"],
        expected_cents(paula_distance)
    );

    let other_month = (month_start + Months::new(1)).format("%Y-%m").to_string();
    assert_eq!(
        statement_of(&app, &paula, &other_month).await["entries"],
        json!([])
    );
    let (status, _) = app
        .get(&format!("{WALLET}/statement/novembre"), Some(&paula))
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let (status, _) = app.get(&format!("{WALLET}/statement/{month}"), None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_wallet_opened_after_getting_off_does_not_share_that_trip() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app
        .create_liane(&admin, &unique_name("Trop tard"), &[a, b])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let (driver, _) = app.new_member("Denis", liane_id, a, b).await;
    let (paula, _) = app.new_member("Paula", liane_id, a, b).await;
    open_wallet(&app, &driver).await;

    let ride = propose(&app, liane_id, &driver).await;
    book(&app, &ride, &paula).await;
    declare(&app, &ride, &driver, "Start", a).await;
    declare(&app, &ride, &paula, "Start", a).await;
    declare(&app, &ride, &paula, "End", b).await;
    open_wallet(&app, &paula).await;
    declare(&app, &ride, &driver, "End", b).await;

    let month = month_of(&ride);
    assert_eq!(
        statement_of(&app, &paula, &month).await["entries"],
        json!([])
    );
    assert_eq!(
        statement_of(&app, &driver, &month).await["received_cents"],
        0
    );
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_share_is_recorded_only_once_the_driver_has_declared_the_trip_too() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app
        .create_liane(&admin, &unique_name("Les deux"), &[a, b])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let (driver, _) = app.new_member("Denis", liane_id, a, b).await;
    let (paula, _) = app.new_member("Paula", liane_id, a, b).await;
    open_wallet(&app, &driver).await;
    open_wallet(&app, &paula).await;

    let ride = propose(&app, liane_id, &driver).await;
    let month = month_of(&ride);
    book(&app, &ride, &paula).await;
    declare(&app, &ride, &driver, "Start", a).await;
    declare(&app, &ride, &paula, "Start", a).await;
    declare(&app, &ride, &paula, "End", b).await;
    assert_eq!(
        statement_of(&app, &paula, &month).await["entries"],
        json!([])
    );

    declare(&app, &ride, &driver, "End", b).await;
    assert_eq!(
        statement_of(&app, &paula, &month).await["entries"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
}
